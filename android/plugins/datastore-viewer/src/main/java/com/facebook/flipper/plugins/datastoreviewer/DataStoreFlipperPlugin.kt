/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.datastoreviewer

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import com.facebook.flipper.core.FlipperConnection
import com.facebook.flipper.core.FlipperObject
import com.facebook.flipper.core.FlipperPlugin
import com.google.protobuf.GeneratedMessageLite
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

class DataStoreFlipperPlugin(private val dataStoresMap: Map<String, DataStore<*>>) : FlipperPlugin {

  private var jobs: List<Job>? = null

  override fun getId(): String {
    return "DataStore"
  }

  override fun onConnect(connection: FlipperConnection) {
    registerSetDataStoreReceiver(connection)
    registerDeleteDataStoreReceiver(connection)
    collectAllDataStores(connection)
  }

  override fun onDisconnect() {
    jobs?.forEach { it.cancel() }
    jobs = null
  }

  override fun runInBackground(): Boolean {
    return false
  }

  @Suppress("UNCHECKED_CAST", "IMPLICIT_CAST_TO_ANY")
  private fun registerSetDataStoreReceiver(connection: FlipperConnection) {
    connection.receive("setDataStoreItem") { params, responder ->
      val preferencesFileName = params.getString("dataStoreName")
      val preferenceName = params.getString("preferenceName")
      runBlocking {
        (getDataStore(preferencesFileName) as DataStore<Any>).updateData {
          val value = params.get("preferenceValue")
          when (it) {
            is Preferences -> it.setData(preferenceName, value)
            else -> (it as GeneratedMessageLite<*, *>).setData(preferenceName, value)
          }
        }
      }
      responder.success()
    }
  }

  @Suppress("UNCHECKED_CAST")
  private fun registerDeleteDataStoreReceiver(connection: FlipperConnection) {
    connection.receive("deleteDataStoreItem") { params, responder ->
      val preferencesFileName = params.getString("dataStoreName")
      val preferenceName = params.getString("preferenceName")
      runBlocking {
        (getDataStore(preferencesFileName) as DataStore<Any>).updateData {
          when (it) {
            is Preferences -> it.deleteData(preferenceName)
            else -> throw IllegalArgumentException("type: $it\nDelete ${it.javaClass.simpleName} is not supported!!")
          }
        }
      }
      responder.success()
    }
  }

  private fun collectAllDataStores(connection: FlipperConnection) {
    jobs = dataStoresMap.map { (key, value) ->
      CoroutineScope(Dispatchers.IO).launch {
        value.data.collectLatest {
          connection.send("dataStoreChange", toFlipperObject(key, value))
        }
      }
    }
  }

  private fun getDataStore(name: String): DataStore<*> {
    return dataStoresMap[name]
      ?: throw IllegalStateException("Unknown datastore $name")
  }

  private fun toFlipperObject(name: String, dataStore: DataStore<*>): FlipperObject {
    val dataStoreFlipperObject = when (val data = runBlocking { dataStore.data.first() }) {
      is Preferences -> data.toFlipperObject()
      else -> (data as GeneratedMessageLite<*, *>).toFlipperObject()
    }
    return FlipperObject.Builder()
      .put(name, dataStoreFlipperObject)
      .build()
  }
}
