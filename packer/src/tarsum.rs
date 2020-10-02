/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

//! Intrinsic hash for a tarball.

use anyhow::Result;
use std::collections;
use std::io;

#[derive(Eq, PartialEq, Debug, serde::Serialize)]
pub struct HashSum(String);

/// Computes the intrinsic SHA256 checksum of a tar archive.
pub fn tarsum<R: io::Read>(reader: R) -> Result<HashSum> {
    use sha2::Digest;

    let mut archive = tar::Archive::new(reader);
    let mut map = collections::BTreeMap::new();

    // Store all entries in a BTreeMap using their path as key which implements `Ord`.
    // This way we ensure that the hash of hashes is consistent indepent of the
    // file order inside the archive.
    for entry in archive.entries()? {
        let mut e = entry?;
        let path = e.path()?.into_owned();
        map.insert(path.clone(), digest_file(&mut e)?);
    }

    let mut digest = sha2::Sha256::new();
    for (_, file_hash) in map {
        digest.input(file_hash.0);
    }
    let hash = digest.result();
    Ok(HashSum(data_encoding::HEXLOWER.encode(&hash)))
}

fn digest_file<R: io::Read>(reader: &mut R) -> io::Result<HashSum> {
    use sha2::Digest;
    let mut digest = sha2::Sha256::new();
    io::copy(reader, &mut digest)?;
    let hash = digest.result();
    Ok(HashSum(data_encoding::HEXLOWER.encode(&hash)))
}

#[cfg(test)]
mod test {
    use super::*;
    use std::fs;
    use std::path;

    #[test]
    fn test_nested_archive_tarsum() {
        // This is an archive with a nested directory structure.
        let archive_path = path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("__fixtures__")
            .join("nested_archive.tar");
        let reader = fs::File::open(archive_path).unwrap();
        let res = tarsum(reader).unwrap();

        assert_eq!(
            res,
            HashSum("6f92565bb50b9469494b3e1ad668f5d809caa3ffb534c3e56dec75f7ea7912df".to_string())
        );
    }

    #[test]
    fn test_differently_ordered_archives() {
        // These archives have equivalent contents but were created in reverse ways:
        // $ tar cf archive_a.tar archive/a.txt
        // $ tar cf archive_b.tar archive/b.txt
        // $ tar rf archive_a.tar archive/b.txt
        // $ tar rf archive_b.tar archive/a.txt
        // $ gsha256sum archive_*.tar
        // 8de80c3904d85115d1595d48c215022e5db225c920811d4d2eee80586e6390c8  archive_a.tar
        // 60097b704cb1684f52f7e98e98193595ea2876047e9ecc6931db97757bc8a5fd  archive_b.tar
        let fixture_path = path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("__fixtures__");
        let archive_a = fixture_path.join("archive_a.tar");
        let archive_b = fixture_path.join("archive_b.tar");

        let reader_a = fs::File::open(archive_a).unwrap();
        let reader_b = fs::File::open(archive_b).unwrap();
        let res_a = tarsum(reader_a).unwrap();
        let res_b = tarsum(reader_b).unwrap();

        assert_eq!(res_a, res_b);
    }
}
