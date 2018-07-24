/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors.utils;

import static android.view.WindowManager.LayoutParams;

import android.os.Build;
import android.view.View;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.annotation.Nullable;

public final class AndroidRootResolver {

  private static final String WINDOW_MANAGER_IMPL_CLAZZ = "android.view.WindowManagerImpl";
  private static final String WINDOW_MANAGER_GLOBAL_CLAZZ = "android.view.WindowManagerGlobal";
  private static final String VIEWS_FIELD = "mViews";
  private static final String WINDOW_PARAMS_FIELD = "mParams";
  private static final String GET_DEFAULT_IMPL = "getDefault";
  private static final String GET_GLOBAL_INSTANCE = "getInstance";

  private boolean initialized;
  private Object windowManagerObj;
  private Field viewsField;
  private Field paramsField;

  public static class Root {
    public final View view;
    public final LayoutParams param;

    private Root(View view, LayoutParams param) {
      this.view = view;
      this.param = param;
    }
  }

  public @Nullable List<Root> listActiveRoots() {
    if (!initialized) {
      initialize();
    }

    if (null == windowManagerObj) {
      return null;
    }

    if (null == viewsField) {
      return null;
    }
    if (null == paramsField) {
      return null;
    }

    List<View> views = null;
    List<LayoutParams> params = null;

    try {
      if (Build.VERSION.SDK_INT < 19) {
        views = Arrays.asList((View[]) viewsField.get(windowManagerObj));
        params = Arrays.asList((LayoutParams[]) paramsField.get(windowManagerObj));
      } else {
        views = (List<View>) viewsField.get(windowManagerObj);
        params = (List<LayoutParams>) paramsField.get(windowManagerObj);
      }
    } catch (RuntimeException | IllegalAccessException re) {
      return null;
    }

    List<Root> roots = new ArrayList<>();
    for (int i = 0, stop = views.size(); i < stop; i++) {
      roots.add(new Root(views.get(i), params.get(i)));
    }
    return roots;
  }

  private void initialize() {
    initialized = true;
    String accessClass =
        Build.VERSION.SDK_INT > 16 ? WINDOW_MANAGER_GLOBAL_CLAZZ : WINDOW_MANAGER_IMPL_CLAZZ;
    String instanceMethod = Build.VERSION.SDK_INT > 16 ? GET_GLOBAL_INSTANCE : GET_DEFAULT_IMPL;

    try {
      Class<?> clazz = Class.forName(accessClass);
      Method getMethod = clazz.getMethod(instanceMethod);
      windowManagerObj = getMethod.invoke(null);
      viewsField = clazz.getDeclaredField(VIEWS_FIELD);
      viewsField.setAccessible(true);
      paramsField = clazz.getDeclaredField(WINDOW_PARAMS_FIELD);
      paramsField.setAccessible(true);
    } catch (InvocationTargetException | IllegalAccessException | RuntimeException | NoSuchMethodException | NoSuchFieldException | ClassNotFoundException ignored) {
    }
  }
}
