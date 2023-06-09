/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.datastore

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.RecyclerView
import com.facebook.flipper.sample.NavigationFacade
import com.facebook.flipper.sample.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class DataStoreTestActivity : AppCompatActivity() {

  private val preferenceAdapter = DataStoreAdapter()
  private val protoAdapter = DataStoreAdapter()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    NavigationFacade.sendNavigationEvent("flipper://datastore_test_activity/")
    setContentView(R.layout.activity_datastore)

    findViewById<RecyclerView>(R.id.preference_datastore_recycler_view).adapter = preferenceAdapter
    CoroutineScope(Dispatchers.IO).launch {
      datastore1.data.collectLatest {
        val dataStorePairList = it.asMap().map { (key, value) -> DataStorePair(key.name, value) }
        preferenceAdapter.submitList(dataStorePairList)
      }
    }

    findViewById<RecyclerView>(R.id.proto_datastore_recycler_view).adapter = protoAdapter
    CoroutineScope(Dispatchers.IO).launch {
      datastore2.data.collectLatest { proto ->
        val dataStorePairList = listOf(
          DataStorePair("sample_boolean", proto.sampleBoolean),
          DataStorePair("sample_integer", proto.sampleInteger),
          DataStorePair("sample_long", proto.sampleLong),
          DataStorePair("sample_float", proto.sampleFloat),
          DataStorePair("sample_double", proto.sampleDouble),
          DataStorePair("sample_string", proto.sampleString),
          DataStorePair("sample_bytes", proto.sampleBytes),
          DataStorePair("sample_enum", proto.sampleEnum),
        )
        protoAdapter.submitList(dataStorePairList)
      }
    }
  }
}
