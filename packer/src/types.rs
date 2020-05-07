/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

use clap::arg_enum;
use std::fmt::{self, Display};

arg_enum! {
    #[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, serde::Deserialize)]
    #[serde(rename_all = "lowercase")]
    pub enum Platform {
        Mac,
        Linux,
        Windows
    }
}

#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    serde::Deserialize,
    serde::Serialize
)]
#[serde(rename_all = "lowercase")]
pub enum PackType {
    Frameworks,
    Core,
}

impl Display for PackType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use PackType::*;
        match *self {
            Frameworks => write!(f, "frameworks"),
            Core => write!(f, "core"),
        }
    }
}
