/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.stetho

import android.app.Activity
import android.view.View
import com.facebook.flipper.plugins.uidebugger.stetho.ReflectionUtil.getFieldValue
import com.facebook.flipper.plugins.uidebugger.stetho.ReflectionUtil.tryGetClassForName
import java.lang.reflect.Field
import javax.annotation.concurrent.NotThreadSafe

/**
 * Compatibility abstraction which allows us to generalize access to both the support library's
 * fragments and the built-in framework version. Note: both versions can be live at the same time in
 * a single application and even on a single object instance.
 *
 * Type safety is enforced via generics internal to the implementation but treated as opaque from
 * the outside.
 *
 * @param <FRAGMENT>
 * @param <DIALOG_FRAGMENT>
 * @param <FRAGMENT_MANAGER>
 * @param <FRAGMENT_ACTIVITY>
 */
@NotThreadSafe
abstract class FragmentCompat<
    FRAGMENT, DIALOG_FRAGMENT, FRAGMENT_MANAGER, FRAGMENT_ACTIVITY : Activity> {

  companion object {
    var frameworkInstance: FragmentCompat<*, *, *, *>? = null
      get() {
        if (field == null) {
          field = FragmentCompatFramework()
        }
        return field
      }

    var supportInstance: FragmentCompat<*, *, *, *>? = null
      get() {
        if (field == null && hasSupportFragment) {
          field = FragmentCompatSupportLib()
        }
        return field
      }

    private var hasSupportFragment = false
    init {
      hasSupportFragment = tryGetClassForName("androidx.fragment.app.Fragment") != null
    }

    fun isDialogFragment(fragment: Any): Boolean {
      val supportLib: FragmentCompat<*, *, *, *>? = supportInstance
      if (supportLib != null && supportLib.dialogFragmentClass?.isInstance(fragment) == true) {
        return true
      }

      val framework: FragmentCompat<*, *, *, *>? = frameworkInstance
      return framework != null && framework.dialogFragmentClass?.isInstance(fragment) == true
    }

    fun findFragmentForView(view: View): Any? {
      val activity = ViewUtil.tryGetActivity(view) ?: return null
      return findFragmentForViewInActivity(activity, view)
    }

    private fun findFragmentForViewInActivity(activity: Activity, view: View): Any? {
      val supportLib: FragmentCompat<*, *, *, *>? = supportInstance

      // Try the support library version if it is present and the activity is FragmentActivity.
      if (supportLib != null && supportLib.fragmentActivityClass?.isInstance(activity) == true) {
        val fragment = supportLib.findFragmentForViewInActivity(activity, view)
        if (fragment != null) {
          return fragment
        }
      }

      // Try the actual Android runtime version if we are on a sufficiently high API level for it to
      // exist.  Note that technically we can have both the support library and the framework
      // version in the same object instance due to FragmentActivity extending Activity (which has
      // fragment support in the system).
      val framework: FragmentCompat<*, *, *, *>? = frameworkInstance
      if (framework != null) {
        val fragment = framework.findFragmentForViewInActivity(activity, view)
        if (fragment != null) {
          return fragment
        }
      }
      return null
    }
  }

  abstract val fragmentClass: Class<FRAGMENT>?
  abstract val dialogFragmentClass: Class<DIALOG_FRAGMENT>?
  abstract val fragmentActivityClass: Class<FRAGMENT_ACTIVITY>?

  abstract fun forFragment(): FragmentAccessor<FRAGMENT, FRAGMENT_MANAGER>?
  abstract fun forDialogFragment():
      DialogFragmentAccessor<DIALOG_FRAGMENT, FRAGMENT, FRAGMENT_MANAGER>?
  abstract fun forFragmentManager(): FragmentManagerAccessor<FRAGMENT_MANAGER, FRAGMENT>?
  abstract fun forFragmentActivity(): FragmentActivityAccessor<FRAGMENT_ACTIVITY, FRAGMENT_MANAGER>?

  abstract fun getDialogFragments(activity: Activity): List<Any>
  abstract fun findFragmentForViewInActivity(activity: Activity, view: View): Any?
  abstract fun findFragmentForViewInFragment(fragment: Any, view: View): Any?

  class FragmentManagerAccessorViaReflection<FRAGMENT_MANAGER, FRAGMENT> :
      FragmentManagerAccessor<FRAGMENT_MANAGER, FRAGMENT> {
    private var fieldMAdded: Field? = null

    override fun getAddedFragments(fragmentManager: FRAGMENT_MANAGER): List<FRAGMENT> {

      // This field is actually sitting on FragmentManagerImpl, which derives from FragmentManager
      if (fieldMAdded == null) {
        fragmentManager?.let { manager ->
          val field = manager::class.java.getDeclaredField("mAdded")
          field.isAccessible = true
          fieldMAdded = field
        }
      }

      fieldMAdded?.let { field ->
        return getFieldValue(field, fragmentManager) as List<FRAGMENT>
      }

      return emptyList()
    }
  }
}
