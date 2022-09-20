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
  private val register: MutableMap<Class<*>, NodeDescriptor<*>> = HashMap()

  companion object {

    fun withDefaults(): DescriptorRegister {
      val mapping = DescriptorRegister()
      mapping.register(Any::class.java, ObjectDescriptor)
      mapping.register(ApplicationRef::class.java, ApplicationRefDescriptor)
      mapping.register(Activity::class.java, ActivityDescriptor)
      mapping.register(Window::class.java, WindowDescriptor)
      mapping.register(ViewGroup::class.java, ViewGroupDescriptor)
      mapping.register(View::class.java, ViewDescriptor)
      mapping.register(TextView::class.java, TextViewDescriptor)
      mapping.register(Button::class.java, ButtonDescriptor)
      mapping.register(ViewPager::class.java, ViewPagerDescriptor)
      mapping.register(android.app.Fragment::class.java, FragmentFrameworkDescriptor)
      mapping.register(androidx.fragment.app.Fragment::class.java, FragmentSupportDescriptor)

      @Suppress("unchecked_cast")
      for (clazz in mapping.register.keys) {
        val maybeDescriptor: NodeDescriptor<*>? = mapping.register[clazz]
        maybeDescriptor?.let { descriptor ->
          if (descriptor is ChainedDescriptor<*>) {
            val chainedDescriptor = descriptor as ChainedDescriptor<Any>
            val superClass: Class<*> = clazz.superclass
            val maybeSuperDescriptor: NodeDescriptor<*>? = mapping.descriptorForClass(superClass)

            maybeSuperDescriptor?.let { superDescriptor ->
              if (superDescriptor is ChainedDescriptor<*>) {
                chainedDescriptor.setSuper(superDescriptor as ChainedDescriptor<Any>)
              }
            }
          }
        }
      }

      return mapping
    }
  }

  fun <T> register(clazz: Class<T>, descriptor: NodeDescriptor<T>) {
    register[clazz] = descriptor
  }

  fun <T> descriptorForClass(clazz: Class<T>): NodeDescriptor<T>? {
    var mutableClass: Class<*> = clazz
    while (!register.containsKey(mutableClass)) {
      mutableClass = mutableClass.superclass
    }

    return if (register[mutableClass] != null) {
      @Suppress("unchecked_cast")
      register[mutableClass] as NodeDescriptor<T>
    } else {
      null
    }
  }

  fun <T> descriptorForClassUnsafe(clazz: Class<T>): NodeDescriptor<T> {
    return descriptorForClass(clazz)
        ?: throw UIDebuggerException("No descriptor found for ${clazz.name}")
  }
}
