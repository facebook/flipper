/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

@kotlinx.serialization.Serializable sealed class Inspectable {}

// In this context, mutable means you can add/remove items,
// for native android this should probably be false.
@SerialName("array")
@Serializable
data class InspectableArray(val items: List<Inspectable>) : Inspectable()

// In this context, mutable means you can add / remove keys,
// for native android this should probably be false.
@SerialName("object")
@Serializable
data class InspectableObject(val fields: Map<Int, Inspectable>) : Inspectable()

@kotlinx.serialization.Serializable
sealed class InspectableValue : Inspectable() {

  @kotlinx.serialization.Serializable
  @SerialName("text")
  class Text(val value: String) : InspectableValue()

  @kotlinx.serialization.Serializable
  @SerialName("boolean")
  class Boolean(val value: kotlin.Boolean) : InspectableValue()

  @SerialName("number")
  @kotlinx.serialization.Serializable
  data class Number(
      @Serializable(with = NumberSerializer::class) val value: kotlin.Number,
  ) : InspectableValue()

  @SerialName("color")
  @kotlinx.serialization.Serializable
  data class Color(
      val value: com.facebook.flipper.plugins.uidebugger.model.Color,
  ) : InspectableValue()

  @SerialName("coordinate")
  @kotlinx.serialization.Serializable
  data class Coordinate(
      val value: com.facebook.flipper.plugins.uidebugger.model.Coordinate,
  ) : InspectableValue()

  @SerialName("coordinate3d")
  @kotlinx.serialization.Serializable
  data class Coordinate3D(
      val value: com.facebook.flipper.plugins.uidebugger.model.Coordinate3D,
  ) : InspectableValue()

  @SerialName("size")
  @kotlinx.serialization.Serializable
  data class Size(
      val value: com.facebook.flipper.plugins.uidebugger.model.Size,
  ) : InspectableValue()

  @SerialName("bounds")
  @kotlinx.serialization.Serializable
  data class Bounds(
      val value: com.facebook.flipper.plugins.uidebugger.model.Bounds,
  ) : InspectableValue()

  @SerialName("space")
  @kotlinx.serialization.Serializable
  data class SpaceBox(
      val value: com.facebook.flipper.plugins.uidebugger.model.SpaceBox,
  ) : InspectableValue()

  @SerialName("enum")
  @kotlinx.serialization.Serializable
  data class Enum(val value: String) : InspectableValue()

  @SerialName("unknown")
  @kotlinx.serialization.Serializable
  data class Unknown(val value: String?) : InspectableValue() {}

  companion object {
    /**
     * Will attempt to convert Any ref to a suitable primitive inspectable value. Only use if you
     * are dealing with an Any / object type. Prefer the specific constructors
     */
    fun fromAny(any: Any, mutable: kotlin.Boolean = false): Inspectable? {
      return when (any) {
        is kotlin.Number -> InspectableValue.Number(any)
        is kotlin.Boolean -> InspectableValue.Boolean(any)
        is kotlin.String -> InspectableValue.Text(any)
        else -> null
      }
    }
  }
}

object NumberSerializer : KSerializer<Number> {
  override val descriptor: SerialDescriptor =
      PrimitiveSerialDescriptor("com.meta.NumberSerializer", PrimitiveKind.DOUBLE)

  override fun serialize(encoder: Encoder, value: Number) {
    when (value) {
      is Double -> encoder.encodeDouble(value.toDouble())
      is Float -> encoder.encodeFloat(value.toFloat())
      is Long -> encoder.encodeLong(value.toLong())
      is Int -> encoder.encodeInt(value.toInt())
    }
  }

  override fun deserialize(decoder: Decoder): Number {
    return decoder.decodeFloat()
  }
}
