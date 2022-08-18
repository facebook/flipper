/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.stetho

import android.app.Activity
import android.app.Dialog
import android.content.res.Resources
import android.view.View
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.FragmentManager

class FragmentCompatSupportLib :
    FragmentCompat<Fragment, DialogFragment, FragmentManager, FragmentActivity>() {
  override val fragmentClass: Class<Fragment>
    get() = Fragment::class.java
  override val dialogFragmentClass: Class<DialogFragment>
    get() = DialogFragment::class.java
  override val fragmentActivityClass: Class<FragmentActivity>
    get() = FragmentActivity::class.java

  override fun forFragment(): FragmentAccessorSupportLib? {
    return fragmentAccessor
  }

  override fun forDialogFragment(): DialogFragmentAccessorSupportLib? {
    return dialogFragmentAccessor
  }

  override fun forFragmentManager(): FragmentManagerAccessor<FragmentManager, Fragment>? {
    return fragmentManagerAccessor
  }

  override fun forFragmentActivity(): FragmentActivityAccessorSupportLib? {
    return fragmentActivityAccessor
  }

  override fun getFragments(activity: Activity): List<Any> {
    if (!fragmentActivityClass.isInstance(activity)) {
      return emptyList()
    }

    val activityAccessor = forFragmentActivity()
    val fragmentManager =
        activityAccessor?.getFragmentManager(activity as FragmentActivity) ?: return emptyList()

    val fragmentManagerAccessor = forFragmentManager()
    var addedFragments: List<Any?>? = null
    try {
      addedFragments = fragmentManagerAccessor?.getAddedFragments(fragmentManager)
    } catch (e: Exception) {}

    if (addedFragments != null) {
      val N = addedFragments.size - 1
      val dialogFragments = mutableListOf<Any>()
      for (i in 0..N) {
        val fragment = addedFragments[i]
        dialogFragmentClass?.isInstance(fragment)?.let { fragment -> dialogFragments.add(fragment) }
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
    val fragmentManager =
        activityAccessor?.getFragmentManager(activity as FragmentActivity) ?: return null

    return findFragmentForViewInFragmentManager(fragmentManager, view)
  }

  private fun findFragmentForViewInFragmentManager(
      fragmentManager: FragmentManager,
      view: View
  ): Any? {
    val fragmentManagerAccessor = forFragmentManager()
    var fragments: List<Any>? = null
    try {
      fragments = fragmentManagerAccessor?.getAddedFragments(fragmentManager)
    } catch (e: Exception) {}

    if (fragments != null) {
      val N = fragments.size - 1
      for (i in 0..N) {
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

  open class FragmentAccessorSupportLib : FragmentAccessor<Fragment, FragmentManager> {
    override fun getFragmentManager(fragment: Fragment): FragmentManager? {
      return fragment.fragmentManager
    }

    override fun getResources(fragment: Fragment): Resources? {
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
      return fragment.childFragmentManager
    }
  }

  class DialogFragmentAccessorSupportLib :
      FragmentAccessorSupportLib(),
      DialogFragmentAccessor<DialogFragment, Fragment, FragmentManager> {
    override fun getDialog(dialogFragment: DialogFragment): Dialog? {
      return dialogFragment.dialog
    }
  }

  class FragmentActivityAccessorSupportLib :
      FragmentActivityAccessor<FragmentActivity, FragmentManager> {
    override fun getFragmentManager(activity: FragmentActivity): FragmentManager? {
      return activity.supportFragmentManager
    }
  }

  companion object {
    private val fragmentAccessor = FragmentAccessorSupportLib()
    private val dialogFragmentAccessor = DialogFragmentAccessorSupportLib()
    private val fragmentManagerAccessor =
        FragmentManagerAccessorViaReflection<FragmentManager, Fragment>()
    private val fragmentActivityAccessor = FragmentActivityAccessorSupportLib()
  }
}
