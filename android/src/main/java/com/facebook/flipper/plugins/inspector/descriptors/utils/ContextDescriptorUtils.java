/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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

  private static boolean doneFieldDiscovery = false;
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
      if (!doneFieldDiscovery) {
        doneFieldDiscovery = true; // even if it fails, we don't want to retry
        try {
          sThemeImplField = theme.getClass().getDeclaredField("mThemeImpl");
          sThemeImplField.setAccessible(true);
        } catch (NoSuchFieldException e) {
          // hardening against #1736
          return builderMap;
        }

        themeImpl = sThemeImplField.get(theme);
        try {
          sThemeImplThemeKeyField = themeImpl.getClass().getDeclaredField("mKey");
          sThemeImplThemeKeyField.setAccessible(true);
        } catch (NoSuchFieldException e) {
          // hardening against #1736
          return builderMap;
        }

        try {
          sThemeImplAssetManagerField = themeImpl.getClass().getDeclaredField("mAssets");
          sThemeImplAssetManagerField.setAccessible(true);
        } catch (NoSuchFieldException e) {
          // hardening against #1736
          return builderMap;
        }

        try {
          sAssetManagerGetStyleAttributesMethod =
              assetManager.getClass().getDeclaredMethod("getStyleAttributes", int.class);
          sAssetManagerGetStyleAttributesMethod.setAccessible(true);
        } catch (NoSuchMethodException e) {
          // hardening against #1736
          return builderMap;
        }

        themeKey = sThemeImplThemeKeyField.get(themeImpl);
        try {
          sThemeKeyResIdField = themeKey.getClass().getDeclaredField("mResId");
          sThemeKeyResIdField.setAccessible(true);
        } catch (NoSuchFieldException e) {
          // hardening against #1736
          return builderMap;
        }
      } else if (sThemeImplField != null && sThemeImplThemeKeyField != null) {
        themeImpl = sThemeImplField.get(theme);
        themeKey = sThemeImplThemeKeyField.get(themeImpl);
      } else {
        themeKey = null;
      }

      if (sThemeKeyResIdField == null
          || sAssetManagerGetStyleAttributesMethod == null
          || themeKey == null) {
        return builderMap;
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
