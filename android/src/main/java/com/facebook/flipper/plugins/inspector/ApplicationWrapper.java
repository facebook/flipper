/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import com.facebook.flipper.plugins.inspector.descriptors.utils.AndroidRootResolver;
import com.facebook.flipper.plugins.inspector.descriptors.utils.AndroidRootResolver.Root;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

public class ApplicationWrapper implements Application.ActivityLifecycleCallbacks {

  public interface ActivityStackChangedListener {
    void onActivityStackChanged(List<Activity> stack);
  }

  private final Application mApplication;
  private final AndroidRootResolver mAndroidRootsResolver;
  private final List<WeakReference<Activity>> mActivities;
  private final Handler mHandler;
  private ActivityStackChangedListener mListener;

  public ApplicationWrapper(Application application) {
    mApplication = application;
    mAndroidRootsResolver = new AndroidRootResolver();
    mApplication.registerActivityLifecycleCallbacks(this);
    mActivities = new ArrayList<>();
    mHandler = new Handler(Looper.getMainLooper());
  }

  @Override
  public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
    mActivities.add(new WeakReference<>(activity));
    notifyListener();
  }

  @Override
  public void onActivityStarted(Activity activity) {}

  @Override
  public void onActivityResumed(Activity activity) {}

  @Override
  public void onActivityPaused(Activity activity) {}

  @Override
  public void onActivityStopped(Activity activity) {}

  @Override
  public void onActivitySaveInstanceState(Activity activity, Bundle outState) {}

  @Override
  public void onActivityDestroyed(Activity activity) {
    final Iterator<WeakReference<Activity>> activityIterator = mActivities.iterator();

    while (activityIterator.hasNext()) {
      if (activityIterator.next().get() == activity) {
        activityIterator.remove();
      }
    }
    notifyListener();
  }

  private void notifyListener() {
    if (mListener != null) {
      mListener.onActivityStackChanged(getActivityStack());
    }
  }

  public void setListener(ActivityStackChangedListener listener) {
    mListener = listener;
  }

  public Application getApplication() {
    return mApplication;
  }

  public List<Activity> getActivityStack() {
    final List<Activity> activities = new ArrayList<>(mActivities.size());
    final Iterator<WeakReference<Activity>> activityIterator = mActivities.iterator();

    while (activityIterator.hasNext()) {
      final Activity activity = activityIterator.next().get();
      if (activity == null) {
        activityIterator.remove();
      } else {
        activities.add(activity);
      }
    }

    return activities;
  }

  public List<View> getViewRoots() {
    final List<Root> roots = mAndroidRootsResolver.listActiveRoots();
    if (roots == null) {
      return Collections.EMPTY_LIST;
    }

    final List<View> viewRoots = new ArrayList<>(roots.size());
    for (Root root : roots) {
      viewRoots.add(root.view);
    }

    return viewRoots;
  }

  public void postDelayed(Runnable r, long delayMillis) {
    mHandler.postDelayed(r, delayMillis);
  }
}
