/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

use crate::types::{PackType, Platform};
use std::fmt;
use std::io;
use std::path::PathBuf;

#[derive(Debug)]
pub enum Error {
    IOError(io::Error),
    MissingPackFile(Platform, PackType, PathBuf),
}

impl From<io::Error> for Error {
    fn from(e: io::Error) -> Self {
        Error::IOError(e)
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use Error::*;

        match self {
            IOError(e) => write!(f, "IO Error: {}", e),
            Error::MissingPackFile(platform, pack_type, path) => write!(
                f,
                "Couldn't open file to pack for platform {:?} and type {:?}: {}",
                platform,
                pack_type,
                path.to_string_lossy()
            ),
        }
    }
}
