/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors.utils;

import android.support.v4.view.ViewCompat;
import android.support.v4.view.accessibility.AccessibilityNodeInfoCompat;
import android.view.View;
import android.view.accessibility.AccessibilityNodeInfo;
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
   */
  public enum AccessibilityRole {
    NONE(null),
    BUTTON("android.widget.Button"),
    CHECK_BOX("android.widget.CompoundButton"),
    DROP_DOWN_LIST("android.widget.Spinner"),
    EDIT_TEXT("android.widget.EditText"),
    GRID("android.widget.GridView"),
    IMAGE("android.widget.ImageView"),
    IMAGE_BUTTON("android.widget.ImageView"),
    LIST("android.widget.AbsListView"),
    PAGER("android.support.v4.view.ViewPager"),
    RADIO_BUTTON("android.widget.RadioButton"),
    SEEK_CONTROL("android.widget.SeekBar"),
    SWITCH("android.widget.Switch"),
    TAB_BAR("android.widget.TabWidget"),
    TOGGLE_BUTTON("android.widget.ToggleButton"),
    VIEW_GROUP("android.view.ViewGroup"),
    WEB_VIEW("android.webkit.WebView"),
    CHECKED_TEXT_VIEW("android.widget.CheckedTextView"),
    PROGRESS_BAR("android.widget.ProgressBar"),
    ACTION_BAR_TAB("android.app.ActionBar$Tab"),
    DRAWER_LAYOUT("android.support.v4.widget.DrawerLayout"),
    SLIDING_DRAWER("android.widget.SlidingDrawer"),
    ICON_MENU("com.android.internal.view.menu.IconMenuView"),
    TOAST("android.widget.Toast$TN"),
    DATE_PICKER_DIALOG("android.app.DatePickerDialog"),
    TIME_PICKER_DIALOG("android.app.TimePickerDialog"),
    DATE_PICKER("android.widget.DatePicker"),
    TIME_PICKER("android.widget.TimePicker"),
    NUMBER_PICKER("android.widget.NumberPicker"),
    SCROLL_VIEW("android.widget.ScrollView"),
    HORIZONTAL_SCROLL_VIEW("android.widget.HorizontalScrollView"),
    KEYBOARD_KEY("android.inputmethodservice.Keyboard$Key");

    @Nullable private final String mValue;

    AccessibilityRole(String type) {
      mValue = type;
    }

    @Nullable
    public String getValue() {
      return mValue;
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
}
