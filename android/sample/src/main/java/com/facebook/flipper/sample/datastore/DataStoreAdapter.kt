/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.datastore

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.facebook.flipper.sample.R

data class DataStorePair(val key: String, val value: Any)

class DataStoreAdapter : ListAdapter<DataStorePair, DataStoreAdapter.ViewHolder>(DiffCallback()) {

  override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
    return LayoutInflater.from(parent.context)
      .inflate(R.layout.item_datastore, parent, false)
      .let { ViewHolder(it) }
  }

  override fun onBindViewHolder(holder: ViewHolder, position: Int) {
    val item = getItem(position)
    holder.bind(item)
  }

  class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
    fun bind(item: DataStorePair) {
      itemView.findViewById<TextView>(R.id.key_text_view).text = item.key
      itemView.findViewById<TextView>(R.id.type_text_view).text =
        item.value.javaClass.simpleName
      itemView.findViewById<TextView>(R.id.value_text_view).text = item.value.toString()
    }
  }

  private class DiffCallback : DiffUtil.ItemCallback<DataStorePair>() {
    override fun areItemsTheSame(oldItem: DataStorePair, newItem: DataStorePair): Boolean {
      return oldItem.key == newItem.key
    }

    override fun areContentsTheSame(oldItem: DataStorePair, newItem: DataStorePair): Boolean {
      return oldItem == newItem
    }
  }
}
