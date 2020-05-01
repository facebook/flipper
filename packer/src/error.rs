/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

use crate::types::{PackType, Platform};
use std::fmt;
use std::path::PathBuf;

#[derive(Debug)]
pub enum Error {
    MissingPackFile(Platform, PackType, PathBuf),
    MissingPackDefinition(Platform, PackType),
}

impl std::error::Error for Error {}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::MissingPackFile(platform, pack_type, path) => write!(
                f,
                "Couldn't open file to pack for platform {:?} and type {:?}: {}",
                platform,
                pack_type,
                path.to_string_lossy()
            ),
            Error::MissingPackDefinition(platform, pack_type) => write!(
                f,
                "Missing packlist definition for platform {:?} and pack type {:?}.",
                platform, pack_type,
            ),
        }
    }
}
