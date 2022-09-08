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

  //  override fun inspect(obj: Any): FlipperObject {
  //    val descriptor = descriptorForObject(obj)
  //    descriptor?.let { descriptor ->
  //      return (descriptor as Descriptor<Any>).get(obj)
  //    }
  //
  //    return FlipperObject.Builder().build()
  //  }
  //
  //  override fun get(node: T): FlipperObject {
  //    val builder = FlipperObject.Builder()
  //
  //    val propsBuilder = FlipperObject.Builder()
  //    getData(node, propsBuilder)
  //
  //    val childrenBuilder = FlipperArray.Builder()
  //    getChildren(node, childrenBuilder)
  //
  //    builder
  //        .put("key", getId(node))
  //        .put("title", getName(node))
  //        .put("data", propsBuilder)
  //        .put("children", childrenBuilder)
  //
  //    return builder.build()
  //  }
}
