/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

abstract class Descriptor<T> : NodeDescriptor<T> {
  var descritorRegister: DescriptorRegister? = null
  fun setDescriptorRegister(descriptorMapping: DescriptorRegister) {
    this.descritorRegister = descriptorMapping
  }

  protected fun descriptorForClass(clazz: Class<*>): Descriptor<*>? {
    descritorRegister?.let { register ->
      return register.descriptorForClass(clazz)
    }
    return null
  }

  protected fun descriptorForObject(obj: Any): Descriptor<*>? {
    descritorRegister?.let { register ->
      return register.descriptorForClass(obj::class.java)
    }
    return null
  }
}
