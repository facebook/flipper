/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors.utils;

import android.view.View;
import android.view.accessibility.AccessibilityNodeInfo;
import androidx.core.view.ViewCompat;
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat;
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat.AccessibilityActionCompat;
import javax.annotation.Nullable;

/**
 * Utility class that handles the addition of a "role" for accessibility to either a View or
 * AccessibilityNodeInfo.
 */
public class AccessibilityRoleUtil {

  /**
   * These roles are defined by Google's TalkBack screen reader, and this list should be kept up to
   * date with their implementation. Details can be seen in their source code here:
   *
   * <p>https://github.com/google/talkback/blob/master/utils/src/main/java/Role.java
   *
   * <p>The roles spoken by Talkback (roleStrings) should also be kept up to date and are found
   * here:
   *
   * <p>https://github.com/google/talkback/blob/master/compositor/src/main/res/values/strings.xml
   *
   * <p>https://github.com/google/talkback/blob/master/compositor/src/main/res/raw/compositor.json
   */
  public enum AccessibilityRole {
    NONE("android.view.View", ""),
    BUTTON("android.widget.Button", "Button"),
    CHECK_BOX("android.widget.CompoundButton", "Check box"),
    DROP_DOWN_LIST("android.widget.Spinner", "Drop down list"),
    EDIT_TEXT("android.widget.EditText", "Edit box"),
    GRID("android.widget.GridView", "Grid"),
    IMAGE("android.widget.ImageView", "Image"),
    IMAGE_BUTTON("android.widget.ImageView", "Button"),
    LIST("android.widget.AbsListView", "List"),
    PAGER("androidx.viewpager.widget.ViewPager", "Multi-page view"),
    RADIO_BUTTON("android.widget.RadioButton", "Radio button"),
    SEEK_CONTROL("android.widget.SeekBar", "Seek control"),
    SWITCH("android.widget.Switch", "Switch"),
    TAB_BAR("android.widget.TabWidget", "Tab bar"),
    TOGGLE_BUTTON("android.widget.ToggleButton", "Switch"),
    VIEW_GROUP("android.view.ViewGroup", ""),
    WEB_VIEW("android.webkit.WebView", "Webview"),
    CHECKED_TEXT_VIEW("android.widget.CheckedTextView", ""),
    PROGRESS_BAR("android.widget.ProgressBar", "Progress bar"),
    ACTION_BAR_TAB("android.app.ActionBar$Tab", ""),
    DRAWER_LAYOUT("androidx.drawerlayout.widget.DrawerLayout", ""),
    SLIDING_DRAWER("android.widget.SlidingDrawer", ""),
    ICON_MENU("com.android.internal.view.menu.IconMenuView", ""),
    TOAST("android.widget.Toast$TN", ""),
    DATE_PICKER_DIALOG("android.app.DatePickerDialog", ""),
    TIME_PICKER_DIALOG("android.app.TimePickerDialog", ""),
    DATE_PICKER("android.widget.DatePicker", ""),
    TIME_PICKER("android.widget.TimePicker", ""),
    NUMBER_PICKER("android.widget.NumberPicker", ""),
    SCROLL_VIEW("android.widget.ScrollView", ""),
    HORIZONTAL_SCROLL_VIEW("android.widget.HorizontalScrollView", ""),
    KEYBOARD_KEY("android.inputmethodservice.Keyboard$Key", "");

    @Nullable private final String mValue;
    private final String mRoleString;

    AccessibilityRole(String type, String roleString) {
      mValue = type;
      mRoleString = roleString;
    }

    @Nullable
    public String getValue() {
      return mValue;
    }

    public String getRoleString() {
      return mRoleString;
    }

    public static AccessibilityRole fromValue(String value) {
      for (AccessibilityRole role : AccessibilityRole.values()) {
        if (role.getValue() != null && role.getValue().equals(value)) {
          return role;
        }
      }
      return AccessibilityRole.NONE;
    }
  }

  private AccessibilityRoleUtil() {
    // No instances
  }

  public static AccessibilityRole getRole(View view) {
    if (view == null) {
      return AccessibilityRole.NONE;
    }
    AccessibilityNodeInfoCompat nodeInfo = AccessibilityNodeInfoCompat.obtain();
    ViewCompat.onInitializeAccessibilityNodeInfo(view, nodeInfo);
    AccessibilityRole role = getRole(nodeInfo);
    nodeInfo.recycle();
    return role;
  }

  public static AccessibilityRole getRole(AccessibilityNodeInfo nodeInfo) {
    return getRole(new AccessibilityNodeInfoCompat(nodeInfo));
  }

  public static AccessibilityRole getRole(AccessibilityNodeInfoCompat nodeInfo) {
    AccessibilityRole role = AccessibilityRole.fromValue((String) nodeInfo.getClassName());
    if (role.equals(AccessibilityRole.IMAGE_BUTTON) || role.equals(AccessibilityRole.IMAGE)) {
      return nodeInfo.isClickable() ? AccessibilityRole.IMAGE_BUTTON : AccessibilityRole.IMAGE;
    }

    if (role.equals(AccessibilityRole.NONE)) {
      if (AccessibilityUtil.supportsAction(
              nodeInfo, AccessibilityActionCompat.ACTION_PAGE_UP.getId())
          || AccessibilityUtil.supportsAction(
              nodeInfo, AccessibilityActionCompat.ACTION_PAGE_DOWN.getId())
          || AccessibilityUtil.supportsAction(
              nodeInfo, AccessibilityActionCompat.ACTION_PAGE_LEFT.getId())
          || AccessibilityUtil.supportsAction(
              nodeInfo, AccessibilityActionCompat.ACTION_PAGE_RIGHT.getId())) {
        return AccessibilityRole.PAGER;
      }

      AccessibilityNodeInfoCompat.CollectionInfoCompat collection = nodeInfo.getCollectionInfo();
      if (collection != null) {
        // RecyclerView will be classified as a list or grid.
        if (collection.getRowCount() > 1 && collection.getColumnCount() > 1) {
          return AccessibilityRole.GRID;
        } else {
          return AccessibilityRole.LIST;
        }
      }
    }

    return role;
  }

  public static String getTalkbackRoleString(View view) {
    if (view == null) {
      return "";
    }
    return getRole(view).getRoleString();
  }
}
