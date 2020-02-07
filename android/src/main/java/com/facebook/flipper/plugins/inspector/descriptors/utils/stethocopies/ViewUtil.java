/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies;

import android.app.Activity;
import android.content.Context;
import android.content.ContextWrapper;
import android.view.View;
import android.view.ViewParent;
import javax.annotation.Nullable;

final class ViewUtil {
  private ViewUtil() {}

  @Nullable
  static Activity tryGetActivity(View view) {
    if (view == null) {
      return null;
    }

    Context context = view.getContext();

    Activity activityFromContext = tryGetActivity(context);
    if (activityFromContext != null) {
      return activityFromContext;
    }

    ViewParent parent = view.getParent();
    if (parent instanceof View) {
      View parentView = (View) parent;
      return tryGetActivity(parentView);
    }

    return null;
  }

  @Nullable
  private static Activity tryGetActivity(Context context) {
    while (context != null) {
      if (context instanceof Activity) {
        return (Activity) context;
      } else if (context instanceof ContextWrapper) {
        context = ((ContextWrapper) context).getBaseContext();
      } else {
        return null;
      }
    }

    return null;
  }
}
