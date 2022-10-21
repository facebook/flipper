/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.dataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.protobuf.ByteString
import kotlinx.coroutines.runBlocking

const val KEY_DATASTORE_1 = "DATASTORE_1"
const val KEY_DATASTORE_2 = "DATASTORE_2"

val Context.datastore1 by preferencesDataStore(KEY_DATASTORE_1)
val Context.datastore2 by dataStore(KEY_DATASTORE_2, ProtoSerializer)

fun Context.initDataStore() {
  datastore1.initPreferencesDataStore()
  datastore2.initSampleProtoDataStore()
}

private val SAMPLE_BOOLEAN = booleanPreferencesKey("SAMPLE_BOOLEAN")
private val SAMPLE_INTEGER = intPreferencesKey("SAMPLE_INTEGER")
private val SAMPLE_LONG = longPreferencesKey("SAMPLE_LONG")
private val SAMPLE_FLOAT = floatPreferencesKey("SAMPLE_FLOAT")
private val SAMPLE_DOUBLE = doublePreferencesKey("SAMPLE_DOUBLE")
private val SAMPLE_STRING = stringPreferencesKey("SAMPLE_STRING")
private val SAMPLE_STRING_SET = stringSetPreferencesKey("SAMPLE_STRING_SET")

fun DataStore<Preferences>.initPreferencesDataStore() {
  runBlocking {
    edit {
      it.clear()
      it[SAMPLE_BOOLEAN] = false
      it[SAMPLE_INTEGER] = 123
      it[SAMPLE_LONG] = 456L
      it[SAMPLE_FLOAT] = 7.8f
      it[SAMPLE_DOUBLE] = 9.0
      it[SAMPLE_STRING] = "SAMPLE_STRING"
      it[SAMPLE_STRING_SET] = setOf("STRING:1", "STRING:2")
    }
  }
}

fun DataStore<SampleProto>.initSampleProtoDataStore() {
  runBlocking {
    updateData {
      SampleProto.newBuilder().apply {
        sampleBoolean = false
        sampleInteger = 123
        sampleLong = 456L
        sampleFloat = 7.8f
        sampleDouble = 9.0
        sampleString = "SAMPLE_STRING"
        sampleBytes = ByteString.copyFrom("SAMPLE_BYTES".encodeToByteArray())
        sampleEnum = SampleProto.SampleEnum.NORTH
      }.build()
    }
  }
}
