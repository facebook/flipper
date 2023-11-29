/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.view.View
import java.lang.ref.WeakReference

object FragmentTracker {

  class FragmentRef {
    val supportFragment: WeakReference<androidx.fragment.app.Fragment>?
    val frameworkFragment: WeakReference<android.app.Fragment>?
    val isSupportFragment: Boolean

    constructor(supportFragment: androidx.fragment.app.Fragment) {
      this.supportFragment = WeakReference(supportFragment)
      this.frameworkFragment = null
      this.isSupportFragment = true
    }

    constructor(frameworkFragment: android.app.Fragment) {
      this.supportFragment = null
      this.frameworkFragment = WeakReference(frameworkFragment)
      this.isSupportFragment = false
    }

    override fun hashCode(): Int {
      if (isSupportFragment) {
        val fragment = supportFragment?.get()
        fragment?.let { f ->
          return System.identityHashCode(f)
        }
      } else {
        val fragment = frameworkFragment?.get()
        fragment?.let { f ->
          return System.identityHashCode(f)
        }
      }
      return -1
    }

    override fun equals(other: Any?): Boolean {
      if (this === other) return true
      if (javaClass != other?.javaClass) return false

      other as FragmentRef

      if (isSupportFragment != other.isSupportFragment) return false
      if (isSupportFragment && (supportFragment != other.supportFragment)) return false
      else if (frameworkFragment != other.frameworkFragment) return false

      return true
    }

    val view: View?
      get() {
        if (isSupportFragment) {
          val fragment = supportFragment?.get()
          fragment?.let { f ->
            return f.view
          }
        } else {
          val fragment = frameworkFragment?.get()
          fragment?.let { f ->
            return f.view
          }
        }

        return null
      }

    override fun toString(): String {
      if (isSupportFragment) {
        val fragment = supportFragment?.get()
        fragment?.let { f ->
          return "$f"
        }
      } else {
        val fragment = frameworkFragment?.get()
        fragment?.let { f ->
          return "$f"
        }
      }
      return "unknown"
    }
  }

  private val activityFragments: MutableMap<Int, MutableSet<FragmentRef>> = mutableMapOf()
  private val viewFragment: MutableMap<Int, FragmentRef> = mutableMapOf()

  private val supportLibraryLifecycleTracker =
      object : androidx.fragment.app.FragmentManager.FragmentLifecycleCallbacks() {
        override fun onFragmentAttached(
            fm: androidx.fragment.app.FragmentManager,
            f: androidx.fragment.app.Fragment,
            context: android.content.Context
        ) {
          super.onFragmentAttached(fm, f, context)

          f.activity?.let { activity ->
            val fragmentRef = FragmentRef(f)
            activityFragments[System.identityHashCode(activity)]?.add(fragmentRef)
          }
        }

        override fun onFragmentViewCreated(
            fm: androidx.fragment.app.FragmentManager,
            f: androidx.fragment.app.Fragment,
            v: View,
            savedInstanceState: Bundle?
        ) {
          super.onFragmentViewCreated(fm, f, v, savedInstanceState)

          val fragmentRef = FragmentRef(f)
          viewFragment[System.identityHashCode(v)] = fragmentRef
        }

        override fun onFragmentViewDestroyed(
            fm: androidx.fragment.app.FragmentManager,
            f: androidx.fragment.app.Fragment
        ) {
          super.onFragmentViewDestroyed(fm, f)
          for (entry in viewFragment) {
            if (entry.value.supportFragment == f) {
              viewFragment.remove(entry.key)
              break
            }
          }
        }

        override fun onFragmentDetached(
            fm: androidx.fragment.app.FragmentManager,
            f: androidx.fragment.app.Fragment
        ) {
          super.onFragmentDetached(fm, f)

          f.activity?.let { activity ->
            val fragmentRef = FragmentRef(f)
            activityFragments[System.identityHashCode(activity)]?.remove(fragmentRef)
          }

          f.view?.let { view -> viewFragment.remove(System.identityHashCode(view)) }
        }
      }

  private var frameworkLifecycleTracker: Any? = null

  fun trackFragmentsOfActivity(activity: Activity) {
    activityFragments[System.identityHashCode(activity)] = mutableSetOf()
    if (activity is androidx.fragment.app.FragmentActivity) {
      activity.supportFragmentManager.registerFragmentLifecycleCallbacks(
          supportLibraryLifecycleTracker, true)
    } else {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && frameworkLifecycleTracker != null) {
        activity.fragmentManager.registerFragmentLifecycleCallbacks(
            frameworkLifecycleTracker as android.app.FragmentManager.FragmentLifecycleCallbacks,
            true)
      }
    }
  }

  fun untrackFragmentsOfActivity(activity: Activity) {
    activityFragments[System.identityHashCode(activity)]?.let { fragments ->
      fragments.forEach { f ->
        f.view?.let { view -> viewFragment.remove(System.identityHashCode(view)) }
      }
    }
    activityFragments.remove(System.identityHashCode(activity))

    if (activity is androidx.fragment.app.FragmentActivity) {
      activity.supportFragmentManager.unregisterFragmentLifecycleCallbacks(
          supportLibraryLifecycleTracker)
    } else {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && frameworkLifecycleTracker != null) {
        activity.fragmentManager.unregisterFragmentLifecycleCallbacks(
            frameworkLifecycleTracker as android.app.FragmentManager.FragmentLifecycleCallbacks)
      }
    }
  }

  fun getFragment(view: View): Any? {
    val key = System.identityHashCode(view)
    val fragmentRef = viewFragment[key]

    fragmentRef?.let { fragment ->
      fragment.supportFragment?.get()?.let { f ->
        return f
      }

      fragment.frameworkFragment?.get()?.let { f ->
        return f
      }
    }

    return null
  }

  fun getDialogFragments(activity: Activity): List<Any> {
    val key = System.identityHashCode(activity)
    val fragments = mutableListOf<Any>()

    activityFragments[key]?.forEach { fragmentRef ->
      fragmentRef.supportFragment?.get()?.let { fragment ->
        if (androidx.fragment.app.DialogFragment::class.java.isInstance(fragment)) {
          fragments.add(fragmentRef)
        }
      }
      fragmentRef.frameworkFragment?.get()?.let { fragment ->
        if (android.app.DialogFragment::class.java.isInstance(fragment)) {
          fragments.add(fragmentRef)
        }
      }
    }

    return fragments
  }

  init {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        Class.forName("android.app.FragmentManager\$FragmentLifecycleCallbacks") != null) {
      frameworkLifecycleTracker =
          object : android.app.FragmentManager.FragmentLifecycleCallbacks() {
            @Deprecated("Deprecated in Java")
            override fun onFragmentAttached(
                fm: android.app.FragmentManager?,
                f: android.app.Fragment?,
                context: android.content.Context?
            ) {
              super.onFragmentAttached(fm, f, context)
              f?.let { fragment ->
                val fragmentRef = FragmentRef(fragment)
                activityFragments[System.identityHashCode(fragment.activity)]?.add(fragmentRef)
              }
            }

            @Deprecated("Deprecated in Java")
            override fun onFragmentViewCreated(
                fm: android.app.FragmentManager?,
                f: android.app.Fragment?,
                v: View?,
                savedInstanceState: Bundle?
            ) {
              super.onFragmentViewCreated(fm, f, v, savedInstanceState)
              if (f != null && v != null) {
                val fragmentRef = FragmentRef(f)
                viewFragment[System.identityHashCode(v)] = fragmentRef
              }
            }

            @Deprecated("Deprecated in Java")
            override fun onFragmentDetached(
                fm: android.app.FragmentManager?,
                f: android.app.Fragment?
            ) {
              super.onFragmentDetached(fm, f)
              f?.let { fragment ->
                val fragmentRef = FragmentRef(fragment)
                activityFragments[System.identityHashCode(fragment.activity)]?.remove(fragmentRef)

                fragment.view?.let { view -> viewFragment.remove(System.identityHashCode(view)) }
              }
            }
          }
    }
  }
}
