/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.common;

import java.util.LinkedList;
import java.util.List;

final class RingBuffer<T> {
  final int mBufferSize;
  final List<T> mBuffer = new LinkedList<>();

  RingBuffer(int bufferSize) {
    mBufferSize = bufferSize;
  }

  void enqueue(T item) {
    if (mBuffer.size() >= mBufferSize) {
      mBuffer.remove(0);
    }
    mBuffer.add(item);
  }

  void clear() {
    mBuffer.clear();
  }

  List<T> asList() {
    return mBuffer;
  }
}
