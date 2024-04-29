/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import com.facebook.inject.statics.BoundSetStatic
import com.facebook.litho.DebugComponent
import kotlinx.serialization.json.JsonObject

@BoundSetStatic
interface ILithoDebugComponentDescriptorExtension {
  fun getExtraTags(node: DebugComponent): Set<String>?

  fun getExtraHiddenAttributes(node: DebugComponent): JsonObject?
}
