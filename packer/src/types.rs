/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

use clap::arg_enum;

arg_enum! {
    #[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, serde::Deserialize)]
    #[serde(rename_all = "lowercase")]
    pub enum Platform {
        Mac,
        Linux,
        Windows
    }
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PackType {
    Frameworks,
    Core,
}
