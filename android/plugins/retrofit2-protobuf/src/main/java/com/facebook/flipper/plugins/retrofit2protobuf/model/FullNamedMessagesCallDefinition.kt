/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.retrofit2protobuf.model

import me.haroldmartin.protobufjavatoprotobufjs.model.FullNamedMessages

internal data class FullNamedMessagesCallDefinition(
    val path: String,
    val method: String,
    val requestMessageFullName: String?,
    val responseMessageFullName: String?,
    val responseModel: FullNamedMessages?,
    val requestModel: FullNamedMessages?
)
