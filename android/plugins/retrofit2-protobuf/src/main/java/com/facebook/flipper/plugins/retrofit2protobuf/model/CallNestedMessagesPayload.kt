/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.retrofit2protobuf.model

import com.facebook.flipper.core.FlipperArray
import com.facebook.flipper.core.FlipperObject
import com.facebook.flipper.core.FlipperValue

internal data class CallNestedMessagesPayload(
    val path: String,
    val method: String,
    val requestMessageFullName: String?,
    val requestDefinitions: Map<String, Any>?,
    val responseMessageFullName: String?,
    val responseDefinitions: Map<String, Any>?
) : FlipperValue {
    override fun toFlipperObject(): FlipperObject {
        return FlipperObject.Builder()
            .put("path", path)
            .put("method", method)
            .put("requestMessageFullName", requestMessageFullName)
            .put("requestDefinitions", requestDefinitions?.toFlipperObject())
            .put("responseMessageFullName", responseMessageFullName)
            .put("responseDefinitions", responseDefinitions?.toFlipperObject())
            .build()
    }
}

private fun Map<*, *>.toFlipperObject(): FlipperObject {
    val builder = FlipperObject.Builder()
    this.forEach { (key, value) ->
        val castValue = when (value) {
            is Map<*, *> -> value.toFlipperObject()
            is Iterable<*> -> value.toFlipperArray()
            else -> value
        }
        builder.put(key as String, castValue)
    }
    return builder.build()
}

private fun Iterable<*>.toFlipperArray(): FlipperArray =
    fold(FlipperArray.Builder()) { builder, value -> builder.put(value as? String) }.build()
