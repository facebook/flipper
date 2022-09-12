/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.stetho

import java.lang.reflect.Field

object ReflectionUtil {
  fun tryGetClassForName(className: String): Class<*>? {
    return try {
      Class.forName(className)
    } catch (e: ClassNotFoundException) {
      null
    }
  }

  fun tryGetDeclaredField(theClass: Class<*>, fieldName: String): Field? {
    return try {
      theClass.getDeclaredField(fieldName)
    } catch (e: NoSuchFieldException) {
      null
    }
  }

  fun getFieldValue(field: Field, target: Any?): Any? {
    return try {
      field[target]
    } catch (e: IllegalAccessException) {
      throw RuntimeException(e)
    }
  }
}
