/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.TextView
import androidx.viewpager.widget.ViewPager
import com.facebook.flipper.plugins.uidebugger.common.UIDebuggerException
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef

class DescriptorRegister {
  private val register: MutableMap<Class<*>, Descriptor<*>> = HashMap()

  companion object {

    fun withDefaults(): DescriptorRegister {
      val mapping = DescriptorRegister()
      mapping.register(Any::class.java, ObjectDescriptor())
      mapping.register(ApplicationRef::class.java, ApplicationRefDescriptor())
      mapping.register(Activity::class.java, ActivityDescriptor())
      mapping.register(Window::class.java, WindowDescriptor())
      mapping.register(ViewGroup::class.java, ViewGroupDescriptor())
      mapping.register(View::class.java, ViewDescriptor())
      mapping.register(TextView::class.java, TextViewDescriptor())
      mapping.register(Button::class.java, ButtonDescriptor())
      mapping.register(ViewPager::class.java, ViewPagerDescriptor())

      for (clazz in mapping.register.keys) {
        val descriptor: Descriptor<*>? = mapping.register[clazz]
        descriptor?.let { descriptor ->
          if (descriptor is ChainedDescriptor<*>) {
            val chainedDescriptor = descriptor as ChainedDescriptor<Any>
            val superClass: Class<*> = clazz.getSuperclass()
            val superDescriptor: Descriptor<*>? = mapping.descriptorForClass(superClass)
            superDescriptor?.let { superDescriptor ->
              chainedDescriptor.setSuper(superDescriptor as Descriptor<Any>)
            }
          }
        }
      }

      for (descriptor in mapping.register.values) {
        descriptor.setDescriptorRegister(mapping)
      }

      return mapping
    }
  }

  fun <T> register(clazz: Class<T>, descriptor: Descriptor<T>) {
    register[clazz] = descriptor
  }

  fun <T> descriptorForClass(clazz: Class<T>): Descriptor<T>? {
    var clazz: Class<*> = clazz
    while (!register.containsKey(clazz)) {
      clazz = clazz.superclass
    }
    return register[clazz] as Descriptor<T>
  }

  fun <T> descriptorForClassUnsafe(clazz: Class<T>): Descriptor<T> {
    return descriptorForClass(clazz)
        ?: throw UIDebuggerException("No descriptor found for ${clazz.name}")
  }
}
