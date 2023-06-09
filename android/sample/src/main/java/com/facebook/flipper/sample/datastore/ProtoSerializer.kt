/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.datastore

import androidx.datastore.core.CorruptionException
import androidx.datastore.core.Serializer
import androidx.datastore.preferences.protobuf.InvalidProtocolBufferException
import com.facebook.flipper.sample.SampleProto
import java.io.InputStream
import java.io.OutputStream

object ProtoSerializer : Serializer<SampleProto> {

  override val defaultValue: SampleProto = SampleProto.getDefaultInstance()

  override suspend fun readFrom(input: InputStream): SampleProto {
    try {
      return SampleProto.parseFrom(input)
    } catch (exception: InvalidProtocolBufferException) {
      throw CorruptionException("Cannot read proto.", exception)
    }
  }

  override suspend fun writeTo(t: SampleProto, output: OutputStream) = t.writeTo(output)
}
