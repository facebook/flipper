/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors.utils;

import android.content.Context;
import android.content.res.AssetManager;
import android.content.res.Resources;
import android.util.Log;
import android.util.TypedValue;
import com.facebook.flipper.core.FlipperObject;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

public final class ContextDescriptorUtils {
  private static String TAG = "ContextDescriptor";

  private static Field sThemeImplField;
  private static Field sThemeImplThemeKeyField;
  private static Field sThemeImplAssetManagerField;
  private static Field sThemeKeyResIdField;
  private static Method sAssetManagerGetStyleAttributesMethod;

  private ContextDescriptorUtils() {}

  public static FlipperObject themeData(Context context) {
    FlipperObject.Builder themeData = new FlipperObject.Builder();
    Map<String, FlipperObject.Builder> builders = collectThemeValues(context);
    for (Map.Entry<String, FlipperObject.Builder> entry : builders.entrySet()) {
      themeData.put(entry.getKey(), entry.getValue().build());
    }
    return themeData.build();
  }

  private static Map<String, FlipperObject.Builder> collectThemeValues(Context context) {
    Map<String, FlipperObject.Builder> builderMap = new HashMap<>(3);
    try {
      Resources.Theme theme = context.getTheme();
      AssetManager assetManager = context.getAssets();
      final Object themeImpl;
      final Object themeKey;

      // Nasty reflection to get a list of theme attributes that apply to this context.
      if (sThemeImplField == null
          || sThemeImplThemeKeyField == null
          || sThemeKeyResIdField == null
          || sThemeImplAssetManagerField == null) {

        // Early exiting as this bit of code causes too much of the metadata to be created and
        // ultimately leads to out of memory exception. Reference D20441839
        // sThemeImplField = theme.getClass().getDeclaredField("mThemeImpl");
        // sThemeImplField.setAccessible(true);

        // themeImpl = sThemeImplField.get(theme);
        // sThemeImplThemeKeyField = themeImpl.getClass().getDeclaredField("mKey");
        // sThemeImplThemeKeyField.setAccessible(true);

        // sThemeImplAssetManagerField = themeImpl.getClass().getDeclaredField("mAssets");
        // sThemeImplAssetManagerField.setAccessible(true);

        // sAssetManagerGetStyleAttributesMethod =
        //     assetManager.getClass().getDeclaredMethod("getStyleAttributes", int.class);
        // sAssetManagerGetStyleAttributesMethod.setAccessible(true);

        // themeKey = sThemeImplThemeKeyField.get(themeImpl);
        // sThemeKeyResIdField = themeKey.getClass().getDeclaredField("mResId");
        // sThemeKeyResIdField.setAccessible(true);

        return builderMap;

      } else {
        themeImpl = sThemeImplField.get(theme);
        themeKey = sThemeImplThemeKeyField.get(themeImpl);
      }

      int[] appliedThemeResIds = (int[]) sThemeKeyResIdField.get(themeKey);
      TypedValue typedValue = new TypedValue();
      Resources resources = context.getResources();
      for (int themeId : appliedThemeResIds) {
        if (themeId == 0) {
          continue;
        }
        String name = resources.getResourceName(themeId);
        // The res id array can have duplicates
        if (builderMap.containsKey(name)) {
          continue;
        }

        FlipperObject.Builder builder = new FlipperObject.Builder();
        builderMap.put(name, builder);

        int[] attributes =
            (int[]) sAssetManagerGetStyleAttributesMethod.invoke(assetManager, themeId);
        for (int attribute : attributes) {
          if (!theme.resolveAttribute(attribute, typedValue, true)) {
            continue;
          }
          String attributeName = context.getResources().getResourceName(attribute);
          String[] nameParts = attributeName.split(":");
          if (nameParts.length < 2) {
            Log.d(TAG, "Unknown attribute name format " + attributeName);
          } else {
            attributeName = nameParts[1].split("/")[1];
          }
          String strValue = TypedValue.coerceToString(typedValue.type, typedValue.data);
          if (strValue == null) {
            strValue = "null";
          } else if (strValue.startsWith("@")) {
            int resId = Integer.parseInt(strValue.substring(1));
            if (resId == 0) {
              strValue = "null";
            } else {
              strValue = context.getResources().getResourceName(resId);
            }
          }
          builder.put(attributeName, strValue);
        }
      }
    } catch (Throwable ignored) {
      Log.d(TAG, "Failed to generate theme attribute data!", ignored);
    }
    return builderMap;
  }
}
