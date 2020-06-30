/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

mod error;
mod types;

use anyhow::{bail, Context, Result};
use clap::value_t_or_exit;
use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use std::collections::BTreeMap;
use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};
use std::path;
use types::{PackType, Platform};

const DEFAULT_PACKLIST: &str = include_str!("packlist.yaml");
// This is to ensure that all progress bar prefixes are aligned.
const PROGRESS_PREFIX_LEN: usize = 24;

type PackListPlatform = BTreeMap<PackType, Vec<path::PathBuf>>;

#[derive(Debug, serde::Deserialize)]
struct PackList(pub BTreeMap<Platform, PackListPlatform>);

#[derive(Debug, serde::Serialize)]
struct HashSum(String);

#[derive(Debug, serde::Serialize)]
struct PackManifest {
    files: BTreeMap<PackType, HashSum>,
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

fn pack(
    platform: &Platform,
    dist_dir: &std::path::PathBuf,
    pack_list: &PackList,
    output_directory: &std::path::PathBuf,
) -> Result<Vec<(PackType, path::PathBuf)>> {
    let pb = default_progress_bar(pack_list.0.len() as u64 * 2 - 1);
    pb.set_prefix(&format!(
        "{:width$}",
        "Packing archives",
        width = PROGRESS_PREFIX_LEN
    ));
    let packtype_paths = pack_list
        .0
        .get(platform)
        .ok_or_else(|| error::Error::MissingPlatformDefinition(*platform))?;
    let res = packtype_paths
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
            pack_platform(platform, dist_dir, pack_files, pack_type, &mut tar)?;
            pb.inc(1);
            tar.finish()?;
            pb.inc(1);

            Ok((*pack_type, output_path))
        })
        .collect();

    pb.finish();
    res
}

fn pack_platform(
    platform: &Platform,
    dist_dir: &std::path::PathBuf,
    pack_files: &[path::PathBuf],
    pack_type: &PackType,
    tar_builder: &mut tar::Builder<File>,
) -> Result<()> {
    let base_dir = match platform {
        Platform::Mac => path::Path::new(dist_dir).join("mac"),
        // TODO: Verify this.
        Platform::Linux => path::Path::new(dist_dir).join("linux-unpacked"),
        Platform::Windows => path::Path::new(dist_dir).join("win-unpacked"),
    };

    for f in pack_files {
        let full_path = path::Path::new(&base_dir).join(f);
        if !full_path.exists() {
            bail!(error::Error::MissingPackFile(
                *platform, *pack_type, full_path,
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

fn sha256_digest<R: Read>(mut reader: R) -> Result<HashSum> {
    use sha2::{Digest, Sha256};

    let mut sha256 = Sha256::new();
    std::io::copy(&mut reader, &mut sha256)?;
    let hash = sha256.result();

    Ok(HashSum(data_encoding::HEXLOWER.encode(&hash)))
}

fn main() -> Result<(), anyhow::Error> {
    // Ensure to define all env vars used here in the BUCK env, too.
    let args = clap::App::new(env!("CARGO_PKG_NAME"))
        .version(env!("CARGO_PKG_VERSION"))
        .author(env!("CARGO_PKG_AUTHORS"))
        .about("Split the Flipper distribution into smaller, cacheable artifacts")
        .arg(
            clap::Arg::from_usage("-o, --output [DIRECTORY] 'Directory to write output files to.'")
                .default_value("."),
        )
        .arg(
            clap::Arg::from_usage("-d, --dist [DIRECTORY] 'Flipper dist directory to read from.'")
                .default_value("~/fbsource/xplat/sonar/dist"),
        )
        .arg(clap::Arg::from_usage(
            "-p, --packlist=packlist.yaml 'Custom list of files to pack.'",
        ))
        .arg(clap::Arg::from_usage(
            "--no-compression 'Skip compressing the archives (for debugging)'",
        ))
        .arg(
            clap::Arg::from_usage("[PLATFORM] 'Platform to build for'")
                .case_insensitive(true)
                .required(true)
                .possible_values(&Platform::variants()),
        )
        .get_matches();

    let platform = value_t_or_exit!(args.value_of("PLATFORM"), Platform);
    let dist_dir = path::PathBuf::from(
        shellexpand::tilde(args.value_of("dist").expect("argument has default")).to_string(),
    );
    let compress = !args.is_present("no-compression");
    let pack_list_str = args
        .value_of("packlist")
        .map(|f| {
            std::fs::read_to_string(f)
                .unwrap_or_else(|e| panic!("Failed to open packfile {}: {}", f, e))
        })
        .unwrap_or_else(|| DEFAULT_PACKLIST.to_string());
    let pack_list: PackList =
        serde_yaml::from_str(&pack_list_str).expect("Failed to deserialize YAML packlist.");
    let output_directory =
        &path::PathBuf::from(args.value_of("output").expect("argument has default"));
    std::fs::create_dir_all(output_directory).with_context(|| {
        format!(
            "Failed to create output directory '{}'.",
            output_directory.to_string_lossy()
        )
    })?;
    let archive_paths = pack(&platform, &dist_dir, &pack_list, output_directory)?;
    let compressed_archive_paths = if compress {
        compress_paths(&archive_paths)?
    } else {
        archive_paths
    };
    manifest(&compressed_archive_paths, &output_directory)?;

    Ok(())
}

/// Takes a list of archive paths, compresses them with LZMA and returns
/// the updated paths.
/// TODO: Remove compressed artifacts.
fn compress_paths(
    archive_paths: &[(PackType, path::PathBuf)],
) -> Result<Vec<(PackType, path::PathBuf)>> {
    let pb = default_progress_bar(archive_paths.len() as u64 - 1);
    pb.set_prefix(&format!(
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
        .collect::<Result<Vec<(PackType, path::PathBuf)>>>()?;
    pb.finish();

    Ok(res)
}

fn manifest(
    archive_paths: &[(PackType, path::PathBuf)],
    output_directory: &path::PathBuf,
) -> Result<path::PathBuf> {
    let archive_manifest = gen_manifest(&archive_paths)?;
    write_manifest(&output_directory, &archive_manifest)
}

fn write_manifest(
    output_directory: &path::PathBuf,
    archive_manifest: &PackManifest,
) -> Result<path::PathBuf> {
    let path = path::PathBuf::from(output_directory).join("manifest.json");
    let mut file = File::create(&path)
        .with_context(|| format!("Failed to write manifest to {}", &path.to_string_lossy()))?;
    file.write_all(&serde_json::to_string_pretty(archive_manifest)?.as_bytes())?;
    Ok(path)
}

fn gen_manifest(archive_paths: &[(PackType, path::PathBuf)]) -> Result<PackManifest> {
    Ok(PackManifest {
        files: gen_manifest_files(archive_paths)?,
    })
}

fn gen_manifest_files(
    archive_paths: &[(PackType, path::PathBuf)],
) -> Result<BTreeMap<PackType, HashSum>> {
    let pb = default_progress_bar(archive_paths.len() as u64 - 1);
    pb.set_prefix(&format!(
        "{:width$}",
        "Computing manifest",
        width = PROGRESS_PREFIX_LEN
    ));
    let res = archive_paths
        .into_par_iter()
        .map(|(pack_type, path)| {
            let reader = BufReader::new(File::open(path)?);
            let hash = sha256_digest(reader)?;
            pb.inc(1);
            Ok((*pack_type, hash))
        })
        .collect::<Result<Vec<_>>>()?
        .into_iter()
        .fold(
            BTreeMap::new(),
            |mut acc: BTreeMap<PackType, HashSum>, (pack_type, hash_sum)| {
                acc.insert(pack_type, hash_sum);
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
        assert_eq!(res.0.len(), 3);
    }

    #[test]
    fn test_manifest() -> anyhow::Result<()> {
        let tmp_dir = tempdir::TempDir::new("manifest_test")?;
        let artifact_path = path::PathBuf::from(tmp_dir.path()).join("core.tar");
        let mut artifact = File::create(&artifact_path)?;
        artifact.write_all("Hello World.".as_bytes())?;

        let archive_paths = &[(PackType::Core, artifact_path)];
        let path = manifest(archive_paths, &tmp_dir.path().to_path_buf())?;

        let manifest_content = std::fs::read_to_string(&path)?;

        assert_eq!(manifest_content, "{\n  \"files\": {\n    \"core\": \"f4bb1975bf1f81f76ce824f7536c1e101a8060a632a52289d530a6f600d52c92\"\n  }\n}");

        Ok(())
    }
}
