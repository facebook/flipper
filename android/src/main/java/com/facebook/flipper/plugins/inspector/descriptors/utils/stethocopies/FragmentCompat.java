/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.fragment.app.FragmentManager;

import java.lang.reflect.Field;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;
import javax.annotation.concurrent.NotThreadSafe;

/**
 * Compatibility abstraction which allows us to generalize access to both the support library's
 * fragments and the built-in framework version. Note: both versions can be live at the same time in
 * a single application and even on a single object instance.
 *
 * <p>Type safety is enforced via generics internal to the implementation but treated as opaque from
 * the outside.
 *
 * @param <FRAGMENT>
 * @param <DIALOG_FRAGMENT>
 * @param <FRAGMENT_MANAGER>
 * @param <FRAGMENT_ACTIVITY>
 */
@NotThreadSafe
public abstract class FragmentCompat<
    FRAGMENT, DIALOG_FRAGMENT, FRAGMENT_MANAGER, FRAGMENT_ACTIVITY extends Activity> {
  private static FragmentCompat sFrameworkInstance;
  private static FragmentCompat sSupportInstance;

  private static final boolean sHasSupportFragment;

  static {
    sHasSupportFragment =
        ReflectionUtil.tryGetClassForName("androidx.fragment.app.Fragment") != null;
  }

  @Nullable
  public static FragmentCompat getFrameworkInstance() {
    if (sFrameworkInstance == null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
      sFrameworkInstance = new FragmentCompatFramework();
    }
    return sFrameworkInstance;
  }

  @Nullable
  public static FragmentCompat getSupportLibInstance() {
    if (sSupportInstance == null && sHasSupportFragment) {
      sSupportInstance = new FragmentCompatSupportLib();
    }
    return sSupportInstance;
  }

  FragmentCompat() {}

  public abstract Class<FRAGMENT> getFragmentClass();

  public abstract Class<DIALOG_FRAGMENT> getDialogFragmentClass();

  public abstract Class<FRAGMENT_ACTIVITY> getFragmentActivityClass();

  public abstract FragmentAccessor<FRAGMENT, FRAGMENT_MANAGER> forFragment();

  public abstract DialogFragmentAccessor<DIALOG_FRAGMENT, FRAGMENT, FRAGMENT_MANAGER>
      forDialogFragment();

  public abstract FragmentManagerAccessor<FRAGMENT_MANAGER, FRAGMENT> forFragmentManager();

  public abstract FragmentActivityAccessor<FRAGMENT_ACTIVITY, FRAGMENT_MANAGER>
      forFragmentActivity();

  static class FragmentManagerAccessorViaReflection<FRAGMENT_MANAGER, FRAGMENT>
      implements FragmentManagerAccessor<FRAGMENT_MANAGER, FRAGMENT> {
    @Nullable private Field mFieldMAdded;

    @SuppressWarnings("unchecked")
    @Nullable
    @Override
    public List<FRAGMENT> getAddedFragments(FRAGMENT_MANAGER fragmentManager) {
      if (fragmentManager instanceof android.app.FragmentManager) {
        // This field is actually sitting on FragmentManagerImpl, which derives from
        // FragmentManager.
        if (mFieldMAdded == null) {
          Field fieldMAdded =
              ReflectionUtil.tryGetDeclaredField(fragmentManager.getClass(), "mAdded");

          if (fieldMAdded != null) {
            fieldMAdded.setAccessible(true);
            mFieldMAdded = fieldMAdded;
          }
        }
      } else if (fragmentManager instanceof androidx.fragment.app.FragmentManager) {
        return (List<FRAGMENT>) ((FragmentManager) fragmentManager).getFragments();
      }
      return Collections.emptyList();
    }
  }
}
