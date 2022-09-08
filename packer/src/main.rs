/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#![warn(clippy::all, clippy::pedantic, clippy::nursery, clippy::cargo)]
// This doesn't seem to cause any issues and nobody I know can read \u{1234} by heart.
#![allow(clippy::non_ascii_literal)]

mod error;
mod tarsum;
mod types;

use std::collections::BTreeMap;
use std::ffi;
use std::fs::File;
use std::io;
use std::io::BufReader;
use std::io::BufWriter;
use std::io::Write;
use std::path;

use anyhow::bail;
use anyhow::Context;
use anyhow::Result;
use rayon::prelude::IntoParallelIterator;
use rayon::prelude::ParallelIterator;
use types::HashSum;
use types::PackMode;
use types::PackType;
use types::Platform;

const DEFAULT_PACKLIST: &str = include_str!("packlist.yaml");
// This is to ensure that all progress bar prefixes are aligned.
const PROGRESS_PREFIX_LEN: usize = 24;

fn expand_tilde_path(path: &ffi::OsStr) -> Result<path::PathBuf> {
    Ok(path::PathBuf::from(
        shellexpand::tilde(
            &path
                .to_str()
                .ok_or_else(|| anyhow::anyhow!("Not a valid path: {:?}", path))?,
        )
        .to_string(),
    ))
}

#[derive(clap::Parser, Debug)]
#[clap(author, version, about)]
struct Args {
    /// Directory to write output files to.
    #[clap(short, long, parse(from_os_str), default_value = ".")]
    output: path::PathBuf,

    /// Flipper dist directory to read from.
    #[clap(
        short,
        long,
        parse(try_from_os_str = expand_tilde_path),
        default_value = "~/fbsource/xplat/sonar/dist"
    )]
    dist: path::PathBuf,

    /// Custom list of files to pack.
    #[clap(short, long, parse(from_os_str))]
    packlist: Option<path::PathBuf>,

    /// Skip compressing the archives (for debugging)
    #[clap(long)]
    no_compression: bool,

    /// Platform to build for
    #[clap(value_name = "PLATFORM")]
    platform: Platform,
}

type PackListPlatform = BTreeMap<PackType, Vec<String>>;

#[derive(Debug, serde::Deserialize)]
struct PackListSpec {
    mode: PackMode,
    basedir: path::PathBuf,
    files: PackListPlatform,
}

#[derive(Debug, serde::Deserialize)]
struct PackList(pub BTreeMap<Platform, PackListSpec>);

#[derive(Debug, serde::Serialize)]
struct PackFile {
    file_name: String,
    intrinsic_checksum: HashSum,
    extrinsic_checksum: HashSum,
    file_bytes: u64,
}

#[derive(Debug, serde::Serialize)]
struct PackManifest<'a> {
    files: BTreeMap<&'a PackType, PackFile>,
}

fn default_progress_bar(len: u64) -> indicatif::ProgressBar {
    let pb = indicatif::ProgressBar::new(len as u64 * 2);
    pb.set_style(
        indicatif::ProgressStyle::default_bar()
            .template("{prefix:.bold}▕{bar:.magenta}▏{msg}")
            .progress_chars("█▓▒░  "),
    );
    pb
}

fn pack<'a>(
    platform: &'a Platform,
    dist_dir: &'a std::path::Path,
    pack_list: &'a PackList,
    output_directory: &'a std::path::Path,
) -> Result<Vec<(&'a PackType, path::PathBuf)>> {
    let pb = default_progress_bar(pack_list.0.len() as u64 * 2 - 1);
    pb.set_prefix(format!(
        "{:width$}",
        "Packing archives",
        width = PROGRESS_PREFIX_LEN
    ));
    let packlist_spec = pack_list
        .0
        .get(platform)
        .ok_or_else(|| error::Error::MissingPlatformDefinition(platform.clone()))?;
    let base_dir = path::Path::new(dist_dir).join(&packlist_spec.basedir);
    let files = &packlist_spec.files;
    let res = files
        .into_par_iter()
        .map(|(pack_type, pack_files)| {
            let output_path = path::Path::new(output_directory).join(format!("{}.tar", pack_type));
            let mut tar = tar::Builder::new(File::create(&output_path).with_context(|| {
                format!(
                    "Couldn't open file for writing: {}",
                    &output_path.to_string_lossy()
                )
            })?);
            // MacOS uses symlinks for bundling multiple framework versions and pointing
            // to the "Current" one.
            tar.follow_symlinks(false);
            let pack_platform_fn = match packlist_spec.mode {
                types::PackMode::Exact => pack_platform_exact,
                types::PackMode::Glob => pack_platform_glob,
            };
            pack_platform_fn(platform, &base_dir, pack_files, pack_type, &mut tar)?;
            pb.inc(1);
            tar.finish()?;
            pb.inc(1);

            Ok((pack_type, output_path))
        })
        .collect();

    pb.finish();
    res
}

fn pack_platform_glob(
    platform: &Platform,
    base_dir: &path::Path,
    pack_files: &[String],
    pack_type: &PackType,
    tar_builder: &mut tar::Builder<File>,
) -> Result<()> {
    let mut ov = ignore::overrides::OverrideBuilder::new(base_dir);
    for f in pack_files {
        ov.add(f.as_ref())?;
    }

    let walker = ignore::WalkBuilder::new(base_dir)
        // Otherwise we'll include .ignore files, etc.
        .standard_filters(false)
        // This is a big restriction. We won't traverse directories at all.
        // If we did, we could no longer make use of tar's `append_dir_all`
        // method which does a lot of clever stuff about symlinks, etc.
        .max_depth(Some(1))
        .overrides(ov.build()?)
        .build();

    // The first entry is the root dir, which we don't care about.
    for f in walker.into_iter().skip(1) {
        let dir_entry = f?;
        let path = dir_entry.file_name();
        let full_path = path::Path::new(&base_dir).join(&path);
        if !full_path.exists() {
            bail!(error::Error::MissingPackFile(
                platform.clone(),
                pack_type.clone(),
                full_path,
            ));
        }
        if full_path.is_file() {
            tar_builder.append_path_with_name(full_path, &path)?;
        } else if full_path.is_dir() {
            tar_builder.append_dir_all(path, full_path)?;
        }
    }

    Ok(())
}

fn pack_platform_exact(
    platform: &Platform,
    base_dir: &path::Path,
    pack_files: &[String],
    pack_type: &PackType,
    tar_builder: &mut tar::Builder<File>,
) -> Result<()> {
    for f in pack_files {
        let full_path = path::Path::new(&base_dir).join(f);
        if !full_path.exists() {
            bail!(error::Error::MissingPackFile(
                platform.clone(),
                pack_type.clone(),
                full_path,
            ));
        }
        if full_path.is_file() {
            tar_builder.append_path_with_name(full_path, f)?;
        } else if full_path.is_dir() {
            tar_builder.append_dir_all(f, full_path)?;
        }
    }

    Ok(())
}

/// Calculate the sha256 checksum of a file represented by a Reader.
fn sha256_digest<R: io::Read>(mut reader: &mut R) -> Result<HashSum> {
    use sha2::Digest;
    use sha2::Sha256;

    let mut sha256 = Sha256::new();
    std::io::copy(&mut reader, &mut sha256)?;
    let hash = sha256.finalize();

    Ok(HashSum(data_encoding::HEXLOWER.encode(&hash)))
}

fn main() -> Result<(), anyhow::Error> {
    use clap::Parser;
    let args = Args::parse();
    let pack_list_str = args.packlist.as_ref().map_or_else(
        || DEFAULT_PACKLIST.to_string(),
        |f| {
            std::fs::read_to_string(&f)
                .unwrap_or_else(|e| panic!("Failed to open packfile {:?}: {}", &f, e))
        },
    );
    let pack_list: PackList =
        serde_yaml::from_str(&pack_list_str).expect("Failed to deserialize YAML packlist.");
    std::fs::create_dir_all(&args.output)
        .with_context(|| format!("Failed to create output directory '{:?}'.", &args.output))?;
    let archive_paths = pack(&args.platform, &args.dist, &pack_list, &args.output)?;
    let compressed_archive_paths = if args.no_compression {
        None
    } else {
        Some(compress_paths(&archive_paths)?)
    };
    manifest(&archive_paths, &compressed_archive_paths, &args.output)?;

    Ok(())
}

/// Takes a list of archive paths, compresses them with LZMA and returns
/// the updated paths.
/// TODO: Remove compressed artifacts.
fn compress_paths<'a>(
    archive_paths: &'a [(&'a PackType, path::PathBuf)],
) -> Result<Vec<(&PackType, path::PathBuf)>> {
    let pb = default_progress_bar(archive_paths.len() as u64 - 1);
    pb.set_prefix(format!(
        "{:width$}",
        "Compressing archives",
        width = PROGRESS_PREFIX_LEN
    ));
    let res = archive_paths
        .into_par_iter()
        .map(|(pack_type, path)| {
            let input_file = File::open(&path).with_context(|| {
                format!("Failed to open archive '{}'.", &path.to_string_lossy())
            })?;
            let mut reader = BufReader::new(input_file);
            let mut output_path = path::PathBuf::from(path);
            output_path.set_extension("tar.xz");
            let output_file: File = File::create(&output_path).with_context(|| {
                format!(
                    "Failed opening compressed archive '{}' for writing.",
                    &output_path.to_string_lossy()
                )
            })?;
            let writer = BufWriter::new(output_file);
            let mut encoder = xz2::write::XzEncoder::new(writer, 9);
            std::io::copy(&mut reader, &mut encoder)?;
            pb.inc(1);
            Ok((*pack_type, output_path))
        })
        .collect::<Result<Vec<(&PackType, path::PathBuf)>>>()?;
    pb.finish();

    Ok(res)
}

fn manifest(
    archive_paths: &[(&PackType, path::PathBuf)],
    compressed_archive_paths: &Option<Vec<(&PackType, path::PathBuf)>>,
    output_directory: &path::Path,
) -> Result<path::PathBuf> {
    let archive_manifest = gen_manifest(archive_paths, compressed_archive_paths)?;
    write_manifest(output_directory, &archive_manifest)
}

fn write_manifest(
    output_directory: &path::Path,
    archive_manifest: &PackManifest,
) -> Result<path::PathBuf> {
    let path = path::PathBuf::from(output_directory).join("manifest.json");
    let mut file = File::create(&path)
        .with_context(|| format!("Failed to write manifest to {}", &path.to_string_lossy()))?;
    file.write_all(serde_json::to_string_pretty(archive_manifest)?.as_bytes())?;
    Ok(path)
}

fn gen_manifest<'a>(
    archive_paths: &'a [(&PackType, path::PathBuf)],
    compressed_archive_paths: &'a Option<Vec<(&PackType, path::PathBuf)>>,
) -> Result<PackManifest<'a>> {
    Ok(PackManifest {
        files: gen_manifest_files(archive_paths, compressed_archive_paths)?,
    })
}

fn gen_manifest_files<'a>(
    archive_paths: &'a [(&PackType, path::PathBuf)],
    compressed_archive_paths: &'a Option<Vec<(&PackType, path::PathBuf)>>,
) -> Result<BTreeMap<&'a PackType, PackFile>> {
    use std::iter;
    let pb = default_progress_bar((archive_paths.len() as u64 - 1) * 2);
    pb.set_prefix(format!(
        "{:width$}",
        "Computing manifest",
        width = PROGRESS_PREFIX_LEN
    ));
    // This looks like a lot but we're just creating an iterator that either returns the
    // values of `compressed_archive_paths` if it is `Some(_)` or an infinite repetition
    // of `None`. This allows us to zip it below and avoid having to rely on index
    // arithmetic. The `as _` is necessary to tell rustc to perform the casts from
    // something like a `std::iter::Map` to the `Iterator` trait.
    let compressed_iter: Box<dyn Iterator<Item = Option<&(&PackType, path::PathBuf)>>> =
        compressed_archive_paths.as_ref().map_or_else(
            || Box::new(iter::repeat(None)) as _,
            |inner| Box::new(inner.iter().map(Some)) as _,
        );

    let res = archive_paths
        .iter()
        .zip(compressed_iter)
        .collect::<Vec<_>>()
        .into_par_iter()
        .map(|((pack_type, uncompressed_path), compressed)| {
            // If we have a compressed path, use that one, otherwise fall back to uncompressed.
            let path = compressed.map_or(uncompressed_path, |(_, p)| p);
            let file_bytes = File::open(path)?.metadata()?.len();
            let uncompressed_reader = BufReader::new(File::open(uncompressed_path)?);
            let intrinsic_checksum = tarsum::tarsum(uncompressed_reader)?;
            pb.inc(1);
            let extrinsic_checksum = sha256_digest(&mut BufReader::new(File::open(path)?))?;
            pb.inc(1);
            Ok((
                *pack_type,
                PackFile {
                    file_name: path
                        .file_name()
                        // The file name is only indicative and must serialize well, so the lossy approximation is fine.
                        .map_or_else(|| "".to_string(), |v| v.to_string_lossy().to_string()),
                    intrinsic_checksum,
                    extrinsic_checksum,
                    file_bytes,
                },
            ))
        })
        .collect::<Result<Vec<_>>>()?
        .into_iter()
        .fold(
            BTreeMap::new(),
            |mut acc: BTreeMap<_, _>, (pack_type, pack_file)| {
                acc.insert(pack_type, pack_file);
                acc
            },
        );
    pb.finish();
    Ok(res)
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_included_packlist_parses() {
        let res: PackList =
            serde_yaml::from_str(DEFAULT_PACKLIST).expect("Default packlist doesn't deserialize");
        assert_eq!(res.0.len(), 5);
    }

    #[test]
    fn test_manifest() -> anyhow::Result<()> {
        let artifact_path = path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("__fixtures__")
            .join("archive_a.tar");
        let tmp_dir = tempdir::TempDir::new("manifest_test")?;

        let archive_paths = &[(&PackType::new("core"), artifact_path)];
        let path = manifest(archive_paths, &None, tmp_dir.path())?;

        let manifest_content = std::fs::read_to_string(&path)?;

        assert_eq!(
            manifest_content,
            "{\n  \"files\": {\n    \"core\": {\n      \"file_name\": \"archive_a.tar\",\n      \"intrinsic_checksum\": \"f360fae5e433bd5c0ac0e00dbdad22ec51691139b9ec1e6d0dbbe16e0bb4c568\",\n      \"extrinsic_checksum\": \"8de80c3904d85115d1595d48c215022e5db225c920811d4d2eee80586e6390c8\",\n      \"file_bytes\": 3072\n    }\n  }\n}"
        );

        Ok(())
    }
}
