/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.retrofit2protobuf.model

internal data class GenericCallDefinition(
    val path: String,
    val method: String,
    val responseType: Class<*>? = null,
    val requestType: Class<*>? = null
)
