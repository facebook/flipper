/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.common.memory.manager;

public interface DebugMemoryManager {

  int ON_CLOSE_TO_DALVIK_HEAP_LIMIT = 1;

  int ON_SYSTEM_LOW_MEMORY_WHILE_APP_IN_FOREGROUND = 2;

  int ON_SYSTEM_LOW_MEMORY_WHILE_APP_IN_BACKGROUND = 3;

  int ON_APP_BACKGROUNDED = 4;

  void trimMemory(int trimType);
}
