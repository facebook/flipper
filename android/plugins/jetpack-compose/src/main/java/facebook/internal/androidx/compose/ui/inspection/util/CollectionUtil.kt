/*
 * Copyright 2021 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package androidx.compose.ui.inspection.util

import androidx.collection.IntList
import androidx.collection.MutableIntList
import androidx.collection.MutableLongObjectMap
import androidx.collection.mutableIntListOf

fun MutableIntList.removeLast() {
  val last = lastIndex
  if (last < 0) throw NoSuchElementException("List is empty.") else removeAt(last)
}

fun <T, M : MutableLongObjectMap<MutableList<T>>> Iterable<T>.groupByToLongObjectMap(
    destination: M,
    keySelector: (T) -> Long
): M {
  for (element in this) {
    val key = keySelector(element)
    val list = destination.getOrPut(key) { ArrayList() }
    list.add(element)
  }
  return destination
}

fun IntList.copy(): IntList {
  val result = mutableIntListOf()
  forEach { result.add(it) }
  return result
}
