/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors.utils;

import static android.content.Context.ACCESSIBILITY_SERVICE;

import android.content.Context;
import android.graphics.Rect;
import android.os.Build;
import android.text.TextUtils;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.accessibility.AccessibilityManager;
import android.widget.EditText;
import androidx.core.view.ViewCompat;
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.InspectorValue;
import javax.annotation.Nullable;

/**
 * This class provides utility methods for determining certain accessibility properties of {@link
 * View}s and {@link AccessibilityNodeInfoCompat}s. It is porting some of the checks from {@link
 * com.googlecode.eyesfree.utils.AccessibilityNodeInfoUtils}, but has stripped many features which
 * are unnecessary here.
 */
public final class AccessibilityUtil {
  private static final String delimiter = ", ";
  private static final int delimiterLength = delimiter.length();

  private AccessibilityUtil() {}

  public static final EnumMapping sAccessibilityActionMapping =
      new EnumMapping("UNKNOWN") {
        {
          put("FOCUS", AccessibilityNodeInfoCompat.ACTION_FOCUS);
          put("CLEAR_FOCUS", AccessibilityNodeInfoCompat.ACTION_CLEAR_FOCUS);
          put("SELECT", AccessibilityNodeInfoCompat.ACTION_SELECT);
          put("CLEAR_SELECTION", AccessibilityNodeInfoCompat.ACTION_CLEAR_SELECTION);
          put("CLICK", AccessibilityNodeInfoCompat.ACTION_CLICK);
          put("LONG_CLICK", AccessibilityNodeInfoCompat.ACTION_LONG_CLICK);
          put("ACCESSIBILITY_FOCUS", AccessibilityNodeInfoCompat.ACTION_ACCESSIBILITY_FOCUS);
          put(
              "CLEAR_ACCESSIBILITY_FOCUS",
              AccessibilityNodeInfoCompat.ACTION_CLEAR_ACCESSIBILITY_FOCUS);
          put(
              "NEXT_AT_MOVEMENT_GRANULARITY",
              AccessibilityNodeInfoCompat.ACTION_NEXT_AT_MOVEMENT_GRANULARITY);
          put(
              "PREVIOUS_AT_MOVEMENT_GRANULARITY",
              AccessibilityNodeInfoCompat.ACTION_PREVIOUS_AT_MOVEMENT_GRANULARITY);
          put("NEXT_HTML_ELEMENT", AccessibilityNodeInfoCompat.ACTION_NEXT_HTML_ELEMENT);
          put("PREVIOUS_HTML_ELEMENT", AccessibilityNodeInfoCompat.ACTION_PREVIOUS_HTML_ELEMENT);
          put("SCROLL_FORWARD", AccessibilityNodeInfoCompat.ACTION_SCROLL_FORWARD);
          put("SCROLL_BACKWARD", AccessibilityNodeInfoCompat.ACTION_SCROLL_BACKWARD);
          put("CUT", AccessibilityNodeInfoCompat.ACTION_CUT);
          put("COPY", AccessibilityNodeInfoCompat.ACTION_COPY);
          put("PASTE", AccessibilityNodeInfoCompat.ACTION_PASTE);
          put("SET_SELECTION", AccessibilityNodeInfoCompat.ACTION_SET_SELECTION);
          put("SET_SELECTION", AccessibilityNodeInfoCompat.ACTION_SET_SELECTION);
          put("EXPAND", AccessibilityNodeInfoCompat.ACTION_EXPAND);
          put("COLLAPSE", AccessibilityNodeInfoCompat.ACTION_COLLAPSE);
          put("DISMISS", AccessibilityNodeInfoCompat.ACTION_DISMISS);
          put("SET_TEXT", AccessibilityNodeInfoCompat.ACTION_SET_TEXT);
        }
      };

  public static final EnumMapping sImportantForAccessibilityMapping =
      new EnumMapping("AUTO") {
        {
          put("AUTO", View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
          put("NO", View.IMPORTANT_FOR_ACCESSIBILITY_NO);
          put("YES", View.IMPORTANT_FOR_ACCESSIBILITY_YES);
          put("NO_HIDE_DESCENDANTS", View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        }
      };

  /**
   * Given a {@link Context}, determine if any accessibility service is running.
   *
   * @param context The {@link Context} used to get the {@link AccessibilityManager}.
   * @return {@code true} if an accessibility service is currently running.
   */
  public static boolean isAccessibilityEnabled(Context context) {
    return ((AccessibilityManager) context.getSystemService(ACCESSIBILITY_SERVICE)).isEnabled();
  }

  /**
   * Given a {@link Context}, determine if an accessibility touch exploration service (TalkBack) is
   * running.
   *
   * @param context The {@link Context} used to get the {@link AccessibilityManager}.
   * @return {@code true} if an accessibility touch exploration service is currently running.
   */
  public static boolean isTalkbackEnabled(Context context) {
    return ((AccessibilityManager) context.getSystemService(ACCESSIBILITY_SERVICE))
        .isTouchExplorationEnabled();
  }

  /**
   * Returns a sentence describing why a given {@link View} will be ignored by Google's TalkBack
   * screen reader.
   *
   * @param view The {@link View} to evaluate.
   * @return {@code String} describing why a {@link View} is ignored.
   */
  public static String getTalkbackIgnoredReasons(View view) {
    final int important = ViewCompat.getImportantForAccessibility(view);

    if (important == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO) {
      return "View has importantForAccessibility set to 'NO'.";
    }

    if (important == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS) {
      return "View has importantForAccessibility set to 'NO_HIDE_DESCENDANTS'.";
    }

    ViewParent parent = view.getParent();
    while (parent instanceof View) {
      if (ViewCompat.getImportantForAccessibility((View) parent)
          == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS) {
        return "An ancestor View has importantForAccessibility set to 'NO_HIDE_DESCENDANTS'.";
      }
      parent = parent.getParent();
    }

    final AccessibilityNodeInfoCompat node = ViewAccessibilityHelper.createNodeInfoFromView(view);
    if (node == null) {
      return "AccessibilityNodeInfo cannot be found.";
    }

    try {
      if (AccessibilityEvaluationUtil.hasEqualBoundsToViewRoot(node, view)) {
        return "View has the same dimensions as the View Root.";
      }

      if (!node.isVisibleToUser()) {
        return "View is not visible.";
      }

      if (AccessibilityEvaluationUtil.isAccessibilityFocusable(node, view)) {
        return "View is actionable, but has no description.";
      }

      if (AccessibilityEvaluationUtil.hasText(node)) {
        return "View is not actionable, and an ancestor View has co-opted its description.";
      }

      return "View is not actionable and has no description.";
    } finally {
      node.recycle();
    }
  }

  /**
   * Returns a sentence describing why a given {@link View} will be focusable by Google's TalkBack
   * screen reader.
   *
   * @param view The {@link View} to evaluate.
   * @return {@code String} describing why a {@link View} is focusable.
   */
  @Nullable
  public static String getTalkbackFocusableReasons(View view) {
    final AccessibilityNodeInfoCompat node = ViewAccessibilityHelper.createNodeInfoFromView(view);
    if (node == null) {
      return null;
    }
    try {
      final boolean hasText = AccessibilityEvaluationUtil.hasText(node);
      final boolean isCheckable = node.isCheckable();
      final boolean hasNonActionableSpeakingDescendants =
          AccessibilityEvaluationUtil.hasNonActionableSpeakingDescendants(node, view);

      if (AccessibilityEvaluationUtil.isActionableForAccessibility(node)) {
        if (node.getChildCount() <= 0) {
          return "View is actionable and has no children.";
        } else if (hasText) {
          return "View is actionable and has a description.";
        } else if (isCheckable) {
          return "View is actionable and checkable.";
        } else if (hasNonActionableSpeakingDescendants) {
          return "View is actionable and has non-actionable descendants with descriptions.";
        }
      }

      if (AccessibilityEvaluationUtil.isTopLevelScrollItem(node, view)) {
        if (hasText) {
          return "View is a direct child of a scrollable container and has a description.";
        } else if (isCheckable) {
          return "View is a direct child of a scrollable container and is checkable.";
        } else if (hasNonActionableSpeakingDescendants) {
          return "View is a direct child of a scrollable container and has non-actionable "
              + "descendants with descriptions.";
        }
      }

      if (hasText) {
        return "View has a description and is not actionable, but has no actionable ancestor.";
      }

      return null;
    } finally {
      node.recycle();
    }
  }

  private static boolean supportsAction(AccessibilityNodeInfoCompat node, int action) {
    if (node != null) {
      final int supportedActions = node.getActions();

      if ((supportedActions & action) == action) {
        return true;
      }
    }

    return false;
  }

  /**
   * Adds the state segments of Talkback's response to a given list. This should be kept up to date
   * as much as necessary. Details can be seen in the source code here :
   *
   * <p>https://github.com/google/talkback/compositor/src/main/res/raw/compositor.json - search for
   * "description_for_tree_status", "get_switch_state"
   *
   * <p>https://github.com/google/talkback/compositor/src/main/res/values/strings.xml
   */
  private static void addStateSegments(
      StringBuilder talkbackSegments,
      AccessibilityNodeInfoCompat node,
      AccessibilityRoleUtil.AccessibilityRole role) {
    // selected status is always prepended
    if (node.isSelected()) {
      talkbackSegments.append("selected" + delimiter);
    }

    // next check collapse/expand/checked status
    if (supportsAction(node, AccessibilityNodeInfoCompat.ACTION_EXPAND)) {
      talkbackSegments.append("collapsed" + delimiter);
    }

    if (supportsAction(node, AccessibilityNodeInfoCompat.ACTION_COLLAPSE)) {
      talkbackSegments.append("expanded" + delimiter);
    }

    String roleString = role.getRoleString();
    if (node.isCheckable()
        && !roleString.equals("Switch")
        && (!role.equals(AccessibilityRoleUtil.AccessibilityRole.CHECKED_TEXT_VIEW)
            || node.isChecked())) {
      talkbackSegments.append((node.isChecked() ? "checked" : "not checked") + delimiter);
    }

    if (roleString.equals("Switch")) {
      CharSequence switchState = node.getText();
      if (TextUtils.isEmpty(switchState)
          || role == AccessibilityRoleUtil.AccessibilityRole.TOGGLE_BUTTON) {
        talkbackSegments.append((node.isChecked() ? "checked" : "not checked") + delimiter);
      } else {
        talkbackSegments.append(switchState + delimiter);
      }
    }
  }

  private static String removeFinalDelimiter(StringBuilder builder) {
    int end = builder.length();
    if (end > 0) {
      builder.delete(end - delimiterLength, end);
    }
    return builder.toString();
  }

  private static final int SYSTEM_ACTION_MAX = 0x01FFFFFF;

  private static String getHintForCustomActions(AccessibilityNodeInfoCompat node) {
    StringBuilder customActions = new StringBuilder();
    for (AccessibilityNodeInfoCompat.AccessibilityActionCompat action : node.getActionList()) {
      int id = action.getId();
      CharSequence label = action.getLabel();
      if (id > SYSTEM_ACTION_MAX) {
        // don't include custom actions that don't have a label
        if (!TextUtils.isEmpty(label)) {
          customActions.append(label + delimiter);
        }
      } else if (id == AccessibilityNodeInfoCompat.ACTION_DISMISS) {
        customActions.append("Dismiss" + delimiter);
      } else if (id == AccessibilityNodeInfoCompat.ACTION_EXPAND) {
        customActions.append("Expand" + delimiter);
      } else if (id == AccessibilityNodeInfoCompat.ACTION_COLLAPSE) {
        customActions.append("Collapse" + delimiter);
      }
    }

    String actions = removeFinalDelimiter(customActions);
    return actions.length() > 0 ? "Actions: " + actions : "";
  }

  // currently this is not used because the Talkback source logic seems erroneous resulting in
  // get_hint_for_actions never
  // returning any strings - see the TO DO in getTalkbackHint below once source is fixed
  private static String getHintForActions(AccessibilityNodeInfoCompat node) {
    StringBuilder actions = new StringBuilder();
    for (AccessibilityNodeInfoCompat.AccessibilityActionCompat action : node.getActionList()) {
      int id = action.getId();
      CharSequence label = action.getLabel();
      if (id != AccessibilityNodeInfoCompat.ACTION_CLICK
          && id != AccessibilityNodeInfoCompat.ACTION_LONG_CLICK
          && !TextUtils.isEmpty(label)
          && id <= SYSTEM_ACTION_MAX) {
        actions.append(label + delimiter);
      }
    }

    return removeFinalDelimiter(actions);
  }

  private static String getHintForClick(AccessibilityNodeInfoCompat node) {
    for (AccessibilityNodeInfoCompat.AccessibilityActionCompat action : node.getActionList()) {
      int id = action.getId();
      CharSequence label = action.getLabel();
      if (id == AccessibilityNodeInfoCompat.ACTION_CLICK && !TextUtils.isEmpty(label)) {
        return "Double tap to " + label;
      }
    }

    if (node.isCheckable()) {
      return "Double tap to toggle";
    }

    if (node.isClickable()) {
      return "Double tap to activate";
    }

    return "";
  }

  private static String getHintForLongClick(AccessibilityNodeInfoCompat node) {
    for (AccessibilityNodeInfoCompat.AccessibilityActionCompat action : node.getActionList()) {
      int id = action.getId();
      CharSequence label = action.getLabel();
      if (id == AccessibilityNodeInfoCompat.ACTION_LONG_CLICK && !TextUtils.isEmpty(label)) {
        return "Double tap and hold to " + label;
      }
    }

    if (node.isLongClickable()) {
      return "Double tap and hold to long press";
    }

    return "";
  }

  /**
   * Creates the text that Google's TalkBack screen reader will read aloud for a given {@link
   * View}'s hint. This hint is generally ported over from Google's TalkBack screen reader, and this
   * should be kept up to date with their implementation (as much as necessary). Hints can be turned
   * off by user, so it may not actually be spoken and this method assumes the selection style is
   * double tapping (it can also be set to keyboard or single tap but the general idea for the hint
   * is the same). Details can be seen in their source code here:
   *
   * <p>https://github.com/google/talkback/compositor/src/main/res/raw/compositor.json - search for
   * "get_hint_from_node"
   *
   * <p>https://github.com/google/talkback/compositor/src/main/res/values/strings.xml
   *
   * @param view The {@link View} to evaluate for a hint.
   * @return {@code String} representing the hint talkback will say when a {@link View} is focused.
   */
  public static CharSequence getTalkbackHint(View view) {

    final AccessibilityNodeInfoCompat node = ViewAccessibilityHelper.createNodeInfoFromView(view);
    if (node == null) {
      return "";
    }

    StringBuilder hint = new StringBuilder();
    if (node.isEnabled()) {
      AccessibilityRoleUtil.AccessibilityRole role = AccessibilityRoleUtil.getRole(view);

      // special cases for spinners, pagers, and seek bars
      if (role == AccessibilityRoleUtil.AccessibilityRole.DROP_DOWN_LIST) {
        return "Double tap to change";
      } else if (role == AccessibilityRoleUtil.AccessibilityRole.PAGER) {
        if (supportsAction(node, AccessibilityNodeInfoCompat.ACTION_SCROLL_FORWARD)
            || supportsAction(node, AccessibilityNodeInfoCompat.ACTION_SCROLL_BACKWARD)) {
          return "Swipe with two fingers to switch pages";
        } else {
          return "No more pages";
        }
      } else if (role == AccessibilityRoleUtil.AccessibilityRole.SEEK_CONTROL
          && (supportsAction(node, AccessibilityNodeInfoCompat.ACTION_SCROLL_FORWARD)
              || supportsAction(node, AccessibilityNodeInfoCompat.ACTION_SCROLL_BACKWARD))) {
        return "Use volume keys to adjust";
      } else {

        // first custom actions
        String segmentToAdd = getHintForCustomActions(node);
        if (segmentToAdd.length() > 0) {
          hint.append(segmentToAdd + delimiter);
        }

        // TODO: add getHintForActions(node) here if Talkback source gets fixed.
        // Currently the "get_hint_for_actions" in the compositor source never adds to Talkback
        // output
        // because of a mismatched if condition/body. If this changes, we should also add a
        // getHintForActions
        // method here. Source at
        // https://github.com/google/talkback/compositor/src/main/res/raw/compositor.json

        // then normal tap (special case for EditText)
        if (role == AccessibilityRoleUtil.AccessibilityRole.EDIT_TEXT) {
          if (!node.isFocused()) {
            hint.append("Double tap to enter text" + delimiter);
          }
        } else {
          segmentToAdd = getHintForClick(node);
          if (segmentToAdd.length() > 0) {
            hint.append(segmentToAdd + delimiter);
          }
        }

        // then long press
        segmentToAdd = getHintForLongClick(node);
        if (segmentToAdd.length() > 0) {
          hint.append(segmentToAdd + delimiter);
        }
      }
    }
    node.recycle();
    return removeFinalDelimiter(hint);
  }

  /**
   * Creates the text that Google's TalkBack screen reader will read aloud for a given {@link View}.
   * This may be any combination of the {@link View}'s {@code text}, {@code contentDescription}, and
   * the {@code text} and {@code contentDescription} of any ancestor {@link View}.
   *
   * <p>This description is generally ported over from Google's TalkBack screen reader, and this
   * should be kept up to date with their implementation (as much as necessary). Details can be seen
   * in their source code here:
   *
   * <p>https://github.com/google/talkback/compositor/src/main/res/raw/compositor.json - search for
   * "get_description_for_tree", "append_description_for_tree", "description_for_tree_nodes"
   *
   * @param view The {@link View} to evaluate.
   * @return {@code String} representing what talkback will say when a {@link View} is focused.
   */
  @Nullable
  public static CharSequence getTalkbackDescription(View view) {
    final AccessibilityNodeInfoCompat node = ViewAccessibilityHelper.createNodeInfoFromView(view);
    if (node == null) {
      return null;
    }
    try {
      final CharSequence contentDescription = node.getContentDescription();
      final CharSequence nodeText = node.getText();

      final boolean hasNodeText = !TextUtils.isEmpty(nodeText);
      final boolean isEditText = view instanceof EditText;

      StringBuilder talkbackSegments = new StringBuilder();
      AccessibilityRoleUtil.AccessibilityRole role = AccessibilityRoleUtil.getRole(view);
      String roleString = getRoleDescription(view);
      boolean disabled =
          AccessibilityEvaluationUtil.isActionableForAccessibility(node) && !node.isEnabled();

      // EditText's prioritize their own text content over a contentDescription so skip this
      if (!TextUtils.isEmpty(contentDescription) && (!isEditText || !hasNodeText)) {

        // first prepend any status modifiers
        addStateSegments(talkbackSegments, node, role);

        // next add content description
        talkbackSegments.append(contentDescription + delimiter);

        // then role
        if (roleString.length() > 0) {
          talkbackSegments.append(roleString + delimiter);
        }

        // lastly disabled is appended if applicable
        if (disabled) {
          talkbackSegments.append("disabled" + delimiter);
        }

        return removeFinalDelimiter(talkbackSegments);
      }

      // EditText
      if (hasNodeText) {
        // skipped status checks above for EditText

        // password
        if (node.isPassword()) {
          talkbackSegments.append("password" + delimiter);
        }

        // description
        talkbackSegments.append(nodeText + delimiter);

        // role
        if (roleString.length() > 0) {
          talkbackSegments.append(roleString + delimiter);
        }

        // disabled
        if (disabled) {
          talkbackSegments.append("disabled" + delimiter);
        }

        return removeFinalDelimiter(talkbackSegments);
      }

      // If there are child views and no contentDescription the text of all non-focusable children,
      // comma separated, becomes the description.
      if (view instanceof ViewGroup) {
        final StringBuilder concatChildDescription = new StringBuilder();
        final ViewGroup viewGroup = (ViewGroup) view;

        for (int i = 0, count = viewGroup.getChildCount(); i < count; i++) {
          final View child = viewGroup.getChildAt(i);

          final AccessibilityNodeInfoCompat childNodeInfo = AccessibilityNodeInfoCompat.obtain();
          ViewCompat.onInitializeAccessibilityNodeInfo(child, childNodeInfo);

          if (AccessibilityEvaluationUtil.isSpeakingNode(childNodeInfo, child)
              && !AccessibilityEvaluationUtil.isAccessibilityFocusable(childNodeInfo, child)) {
            CharSequence childNodeDescription = getTalkbackDescription(child);
            if (!TextUtils.isEmpty(childNodeDescription)) {
              concatChildDescription.append(childNodeDescription + delimiter);
            }
          }
          childNodeInfo.recycle();
        }

        return removeFinalDelimiter(concatChildDescription);
      }

      return null;
    } finally {
      node.recycle();
    }
  }

  /**
   * Creates a {@link FlipperObject} of useful properties of AccessibilityNodeInfo, to be shown in
   * the Flipper Layout Inspector accessibility extension. All properties are immutable since they
   * are all derived from various {@link View} properties. This is a more complete list than
   * getAccessibilityNodeInfoProperties returns.
   *
   * @param view The {@link View} to derive the AccessibilityNodeInfo properties from.
   * @return {@link FlipperObject} containing the properties.
   */
  @Nullable
  public static FlipperObject getAccessibilityNodeInfoData(View view) {
    final AccessibilityNodeInfoCompat nodeInfo =
        ViewAccessibilityHelper.createNodeInfoFromView(view);
    if (nodeInfo == null) {
      return null;
    }

    final FlipperObject.Builder nodeInfoProps = new FlipperObject.Builder();
    final Rect bounds = new Rect();

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      final FlipperArray.Builder actionsArrayBuilder = new FlipperArray.Builder();
      for (AccessibilityNodeInfoCompat.AccessibilityActionCompat action :
          nodeInfo.getActionList()) {
        final String actionLabel = (String) action.getLabel();
        if (actionLabel != null) {
          actionsArrayBuilder.put(actionLabel);
        } else {
          actionsArrayBuilder.put(
              AccessibilityUtil.sAccessibilityActionMapping.toPicker(action.getId(), false));
        }
      }
      nodeInfoProps.put("actions", actionsArrayBuilder.build());
    }

    nodeInfoProps
        .put("accessibility-focused", nodeInfo.isAccessibilityFocused())
        .put("checkable", nodeInfo.isCheckable())
        .put("checked", nodeInfo.isChecked())
        .put("class-name", nodeInfo.getClassName())
        .put("clickable", nodeInfo.isClickable())
        .put("content-description", nodeInfo.getContentDescription())
        .put("content-invalid", nodeInfo.isContentInvalid())
        .put("context-clickable", nodeInfo.isContextClickable())
        .put("dismissable", nodeInfo.isDismissable())
        .put("drawing-order", nodeInfo.getDrawingOrder())
        .put("editable", nodeInfo.isEditable())
        .put("enabled", nodeInfo.isEnabled())
        .put("important-for-accessibility", nodeInfo.isImportantForAccessibility())
        .put("focusable", nodeInfo.isFocusable())
        .put("focused", nodeInfo.isFocused())
        .put("long-clickable", nodeInfo.isLongClickable())
        .put("multiline", nodeInfo.isMultiLine())
        .put("password", nodeInfo.isPassword())
        .put("scrollable", nodeInfo.isScrollable())
        .put("selected", nodeInfo.isSelected())
        .put("text", nodeInfo.getText())
        .put("visible-to-user", nodeInfo.isVisibleToUser())
        .put("role-description", getRoleDescription(nodeInfo));

    nodeInfo.getBoundsInParent(bounds);
    nodeInfoProps.put(
        "parent-bounds",
        new FlipperObject.Builder()
            .put("width", bounds.width())
            .put("height", bounds.height())
            .put("top", bounds.top)
            .put("left", bounds.left)
            .put("bottom", bounds.bottom)
            .put("right", bounds.right));

    nodeInfo.getBoundsInScreen(bounds);
    nodeInfoProps.put(
        "screen-bounds",
        new FlipperObject.Builder()
            .put("width", bounds.width())
            .put("height", bounds.height())
            .put("top", bounds.top)
            .put("left", bounds.left)
            .put("bottom", bounds.bottom)
            .put("right", bounds.right));

    nodeInfo.recycle();

    return nodeInfoProps.build();
  }

  public static boolean isAXFocused(View view) {
    final AccessibilityNodeInfoCompat nodeInfo =
        ViewAccessibilityHelper.createNodeInfoFromView(view);
    if (nodeInfo == null) {
      return false;
    } else {
      boolean focused = nodeInfo.isAccessibilityFocused();
      nodeInfo.recycle();
      return focused;
    }
  }

  /**
   * Modifies a {@link FlipperObject.Builder} to add Talkback-specific Accessibiltiy properties to
   * be shown in the Flipper Layout Inspector.
   *
   * @param props The {@link FlipperObject.Builder} to add the properties to.
   * @param view The {@link View} to derive the properties from.
   */
  public static void addTalkbackProperties(FlipperObject.Builder props, View view) {
    if (!AccessibilityEvaluationUtil.isTalkbackFocusable(view)) {
      props
          .put("talkback-focusable", false)
          .put("talkback-ignored-reasons", getTalkbackIgnoredReasons(view));
    } else {
      props
          .put("talkback-focusable", true)
          .put("talkback-focusable-reasons", getTalkbackFocusableReasons(view))
          .put("talkback-output", getTalkbackDescription(view))
          .put("talkback-hint", getTalkbackHint(view));
    }
  }

  public static FlipperObject getViewData(View view) {
    final FlipperObject.Builder props = new FlipperObject.Builder();

    // This needs to be an empty string to be mutable. See t20470623.
    CharSequence contentDescription =
        view.getContentDescription() != null ? view.getContentDescription() : "";
    props
        .put("role", AccessibilityRoleUtil.getRole(view).toString())
        .put("role-description", InspectorValue.mutable(getRoleDescription(view)))
        .put("content-description", InspectorValue.mutable(contentDescription))
        .put("focusable", InspectorValue.mutable(view.isFocusable()))
        .put("selected", InspectorValue.mutable(view.isSelected()))
        .put("enabled", InspectorValue.mutable(view.isEnabled()))
        .put("long-clickable", InspectorValue.mutable(view.isLongClickable()))
        .put("clickable", InspectorValue.mutable(view.isClickable()))
        .put("focused", view.isFocused());

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      props.put("accessibility-focused", view.isAccessibilityFocused());
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
      props.put(
          "important-for-accessibility",
          AccessibilityUtil.sImportantForAccessibilityMapping.toPicker(
              view.getImportantForAccessibility()));
    }

    return props.build();
  }

  public static FlipperObject getTalkbackData(View view) {
    if (!AccessibilityEvaluationUtil.isTalkbackFocusable(view)) {
      String reason = getTalkbackIgnoredReasons(view);
      return new FlipperObject.Builder()
          .put("talkback-focusable", false)
          .put("talkback-ignored-reasons", reason == null ? "" : reason)
          .build();
    } else {
      String reason = getTalkbackFocusableReasons(view);
      CharSequence description = getTalkbackDescription(view);
      CharSequence hint = getTalkbackHint(view);
      return new FlipperObject.Builder()
          .put("talkback-focusable", true)
          .put("talkback-focusable-reasons", reason)
          .put("talkback-output", description)
          .put("talkback-hint", hint)
          .build();
    }
  }

  public static String getRoleDescription(View view) {
    AccessibilityNodeInfoCompat nodeInfo = ViewAccessibilityHelper.createNodeInfoFromView(view);
    String roleDescription = getRoleDescription(nodeInfo);
    nodeInfo.recycle();

    if (roleDescription == null || roleDescription == "") {
      AccessibilityRoleUtil.AccessibilityRole role = AccessibilityRoleUtil.getRole(view);
      roleDescription = role.getRoleString();
    }

    return roleDescription;
  }

  public static @Nullable String getRoleDescription(AccessibilityNodeInfoCompat nodeInfo) {
    if (nodeInfo == null) {
      return null;
    }

    // Custom role descriptions are only supported in support library version
    // 24.1 and higher, but there is no way to get support library version
    // info at runtime.
    try {
      return (String) nodeInfo.getRoleDescription();
    } catch (NullPointerException e) {
      // no-op
    }

    return null;
  }
}
