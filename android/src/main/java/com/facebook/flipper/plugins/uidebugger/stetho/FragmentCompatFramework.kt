/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.stetho

import android.annotation.TargetApi
import android.app.*
import android.app.Dialog
import android.app.DialogFragment
import android.app.Fragment
import android.app.FragmentManager
import android.content.res.Resources
import android.os.Build
import android.view.View

class FragmentCompatFramework :
    FragmentCompat<Fragment, DialogFragment, FragmentManager, Activity>() {
  companion object {
    private var fragmentAccessor: FragmentAccessorFrameworkHoneycomb? = null
    private var dialogFragmentAccessor: DialogFragmentAccessorFramework? = null
    private val fragmentManagerAccessor =
        FragmentManagerAccessorViaReflection<FragmentManager, Fragment>()
    private val fragmentActivityAccessor = FragmentActivityAccessorFramework()

    init {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
        fragmentAccessor = FragmentAccessorFrameworkJellyBean()
      } else {
        fragmentAccessor = FragmentAccessorFrameworkHoneycomb()
      }
      fragmentAccessor?.let { accessor ->
        dialogFragmentAccessor = DialogFragmentAccessorFramework(accessor)
      }
    }
  }

  override val fragmentClass: Class<Fragment>
    get() = Fragment::class.java

  override val dialogFragmentClass: Class<DialogFragment>
    get() = DialogFragment::class.java

  override val fragmentActivityClass: Class<Activity>
    get() = Activity::class.java

  override fun forFragment(): FragmentAccessorFrameworkHoneycomb? {
    return fragmentAccessor
  }

  override fun forDialogFragment(): DialogFragmentAccessorFramework? {
    return dialogFragmentAccessor
  }

  override fun forFragmentManager():
      FragmentManagerAccessorViaReflection<FragmentManager, Fragment> {
    return fragmentManagerAccessor
  }

  override fun forFragmentActivity(): FragmentActivityAccessorFramework {
    return fragmentActivityAccessor
  }

  override fun getDialogFragments(activity: Activity): List<Any> {
    if (!fragmentActivityClass.isInstance(activity)) {
      return emptyList()
    }

    val activityAccessor = forFragmentActivity()
    val fragmentManager = activityAccessor.getFragmentManager(activity) ?: return emptyList()

    val fragmentManagerAccessor = forFragmentManager()
    var addedFragments: List<Any?>? = null
    try {
      addedFragments = fragmentManagerAccessor.getAddedFragments(fragmentManager)
    } catch (e: Exception) {}

    if (addedFragments != null) {
      val n = addedFragments.size - 1
      val dialogFragments = mutableListOf<Any>()
      for (i in 0..n) {
        val fragment = addedFragments[i]
        if (fragment != null && dialogFragmentClass.isInstance(fragment)) {
          dialogFragments.add(fragment)
        }
      }
      return dialogFragments
    }

    return emptyList()
  }

  override fun findFragmentForViewInActivity(activity: Activity, view: View): Any? {
    if (!fragmentActivityClass.isInstance(activity)) {
      return null
    }

    val activityAccessor = forFragmentActivity()
    val fragmentManager = activityAccessor.getFragmentManager(activity) ?: return null

    return findFragmentForViewInFragmentManager(fragmentManager, view)
  }

  private fun findFragmentForViewInFragmentManager(
      fragmentManager: FragmentManager,
      view: View
  ): Any? {
    val fragmentManagerAccessor = forFragmentManager()
    var fragments: List<Any>? = null
    try {
      fragments = fragmentManagerAccessor.getAddedFragments(fragmentManager)
    } catch (e: Exception) {}

    if (fragments != null) {
      val n = fragments.size - 1
      for (i in 0..n) {
        val fragment = fragments[i]
        val result = findFragmentForViewInFragment(fragment, view)
        if (result != null) {
          return result
        }
      }
    }
    return null
  }

  override fun findFragmentForViewInFragment(fragment: Any, view: View): Any? {
    if (!fragmentClass.isInstance(fragment)) {
      return null
    }

    val fragmentAccessor = forFragment()
    fragmentAccessor?.let { accessor ->
      if (accessor.getView(fragment as Fragment) === view) {
        return fragment
      }
      val childFragmentManager = accessor.getChildFragmentManager(fragment as Fragment)
      return if (childFragmentManager != null) {
        findFragmentForViewInFragmentManager(childFragmentManager, view)
      } else null
    }

    return null
  }

  open class FragmentAccessorFrameworkHoneycomb : FragmentAccessor<Fragment, FragmentManager> {
    override fun getFragmentManager(fragment: Fragment): FragmentManager? {
      return fragment.fragmentManager
    }

    override fun getResources(fragment: Fragment): Resources {
      return fragment.resources
    }

    override fun getId(fragment: Fragment): Int {
      return fragment.id
    }

    override fun getTag(fragment: Fragment): String? {
      return fragment.tag
    }

    override fun getView(fragment: Fragment): View? {
      return fragment.view
    }

    override fun getChildFragmentManager(fragment: Fragment): FragmentManager? {
      return null
    }
  }

  @TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR1)
  class FragmentAccessorFrameworkJellyBean : FragmentAccessorFrameworkHoneycomb() {
    override fun getChildFragmentManager(fragment: Fragment): FragmentManager? {
      return fragment.childFragmentManager
    }
  }

  class DialogFragmentAccessorFramework(
      val fragmentAccessor: FragmentAccessor<Fragment, FragmentManager>
  ) : DialogFragmentAccessor<DialogFragment, Fragment, FragmentManager> {

    override fun getDialog(dialogFragment: DialogFragment): Dialog {
      return dialogFragment.dialog
    }

    override fun getFragmentManager(fragment: Fragment): FragmentManager? {
      return fragmentAccessor.getFragmentManager(fragment)
    }

    override fun getResources(fragment: Fragment): Resources? {
      return fragmentAccessor.getResources(fragment)
    }

    override fun getId(fragment: Fragment): Int {
      return fragmentAccessor.getId(fragment)
    }

    override fun getTag(fragment: Fragment): String? {
      return fragmentAccessor.getTag(fragment)
    }

    override fun getView(fragment: Fragment): View? {
      return fragmentAccessor.getView(fragment)
    }

    override fun getChildFragmentManager(fragment: Fragment): FragmentManager? {
      return fragmentAccessor.getChildFragmentManager(fragment)
    }
  }

  class FragmentActivityAccessorFramework : FragmentActivityAccessor<Activity, FragmentManager> {
    override fun getFragmentManager(activity: Activity): FragmentManager? {
      return activity.fragmentManager
    }
  }
}
