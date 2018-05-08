/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors.utils;

import static android.content.Context.ACCESSIBILITY_SERVICE;

import android.content.Context;
import android.graphics.Rect;
import android.os.Build;
import android.support.v4.view.ViewCompat;
import android.support.v4.view.accessibility.AccessibilityNodeInfoCompat;
import android.text.TextUtils;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.accessibility.AccessibilityManager;
import android.widget.EditText;
import com.facebook.sonar.core.SonarArray;
import com.facebook.sonar.core.SonarObject;
import javax.annotation.Nullable;

/**
 * This class provides utility methods for determining certain accessibility properties of {@link
 * View}s and {@link AccessibilityNodeInfoCompat}s. It is porting some of the checks from {@link
 * com.googlecode.eyesfree.utils.AccessibilityNodeInfoUtils}, but has stripped many features which
 * are unnecessary here.
 */
public final class AccessibilityUtil {
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

  /**
   * Creates the text that Gogole's TalkBack screen reader will read aloud for a given {@link View}.
   * This may be any combination of the {@link View}'s {@code text}, {@code contentDescription}, and
   * the {@code text} and {@code contentDescription} of any ancestor {@link View}.
   *
   * <p>Note: This string does not include any additional semantic information that Talkback will
   * read, such as "Button", or "disabled".
   *
   * @param view The {@link View} to evaluate.
   * @return {@code String} describing why a {@link View} is focusable.
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

      // EditText's prioritize their own text content over a contentDescription
      if (!TextUtils.isEmpty(contentDescription) && (!isEditText || !hasNodeText)) {
        return contentDescription;
      }

      if (hasNodeText) {
        return nodeText;
      }

      // If there are child views and no contentDescription the text of all non-focusable children,
      // comma separated, becomes the description.
      if (view instanceof ViewGroup) {
        final StringBuilder concatChildDescription = new StringBuilder();
        final String separator = ", ";
        final ViewGroup viewGroup = (ViewGroup) view;

        for (int i = 0, count = viewGroup.getChildCount(); i < count; i++) {
          final View child = viewGroup.getChildAt(i);

          final AccessibilityNodeInfoCompat childNodeInfo = AccessibilityNodeInfoCompat.obtain();
          ViewCompat.onInitializeAccessibilityNodeInfo(child, childNodeInfo);

          CharSequence childNodeDescription = null;
          if (AccessibilityEvaluationUtil.isSpeakingNode(childNodeInfo, child)
              && !AccessibilityEvaluationUtil.isAccessibilityFocusable(childNodeInfo, child)) {
            childNodeDescription = getTalkbackDescription(child);
          }

          if (!TextUtils.isEmpty(childNodeDescription)) {
            if (concatChildDescription.length() > 0) {
              concatChildDescription.append(separator);
            }
            concatChildDescription.append(childNodeDescription);
          }
          childNodeInfo.recycle();
        }

        return concatChildDescription.length() > 0 ? concatChildDescription.toString() : null;
      }

      return null;
    } finally {
      node.recycle();
    }
  }

  /**
   * Creates a {@link SonarObject} of useful properties of AccessibilityNodeInfo, to be shown in the
   * Sonar Layout Inspector. All properties are immutable since they are all derived from various
   * {@link View} properties.
   *
   * @param view The {@link View} to derive the AccessibilityNodeInfo properties from.
   * @return {@link SonarObject} containing the properties.
   */
  @Nullable
  public static SonarObject getAccessibilityNodeInfoProperties(View view) {
    final AccessibilityNodeInfoCompat nodeInfo =
        ViewAccessibilityHelper.createNodeInfoFromView(view);
    if (nodeInfo == null) {
      return null;
    }

    final SonarObject.Builder nodeInfoProps = new SonarObject.Builder();
    final Rect bounds = new Rect();

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      final SonarArray.Builder actionsArrayBuilder = new SonarArray.Builder();
      for (AccessibilityNodeInfoCompat.AccessibilityActionCompat action :
          nodeInfo.getActionList()) {
        final String actionLabel = (String) action.getLabel();
        if (actionLabel != null) {
          actionsArrayBuilder.put(actionLabel);
        } else {
          actionsArrayBuilder.put(
              AccessibilityUtil.sAccessibilityActionMapping.get(action.getId(), false));
        }
      }
      nodeInfoProps.put("actions", actionsArrayBuilder.build());
    }

    nodeInfoProps
        .put("clickable", nodeInfo.isClickable())
        .put("content-description", nodeInfo.getContentDescription())
        .put("text", nodeInfo.getText())
        .put("focused", nodeInfo.isAccessibilityFocused())
        .put("long-clickable", nodeInfo.isLongClickable())
        .put("focusable", nodeInfo.isFocusable());

    nodeInfo.getBoundsInParent(bounds);
    nodeInfoProps.put(
        "parent-bounds",
        new SonarObject.Builder()
            .put("width", bounds.width())
            .put("height", bounds.height())
            .put("top", bounds.top)
            .put("left", bounds.left)
            .put("bottom", bounds.bottom)
            .put("right", bounds.right));

    nodeInfo.getBoundsInScreen(bounds);
    nodeInfoProps.put(
        "screen-bounds",
        new SonarObject.Builder()
            .put("width", bounds.width())
            .put("height", bounds.height())
            .put("top", bounds.top)
            .put("left", bounds.left)
            .put("bottom", bounds.bottom)
            .put("right", bounds.right));

    nodeInfo.recycle();

    return nodeInfoProps.build();
  }

  /**
   * Modifies a {@link SonarObject.Builder} to add Talkback-specific Accessibiltiy properties to be
   * shown in the Sonar Layout Inspector.
   *
   * @param props The {@link SonarObject.Builder} to add the properties to.
   * @param view The {@link View} to derive the properties from.
   */
  public static void addTalkbackProperties(SonarObject.Builder props, View view) {
    if (!AccessibilityEvaluationUtil.isTalkbackFocusable(view)) {
      props
          .put("talkback-ignored", true)
          .put("talkback-ignored-reasons", getTalkbackIgnoredReasons(view));
    } else {
      props
          .put("talkback-focusable", true)
          .put("talkback-focusable-reasons", getTalkbackFocusableReasons(view))
          .put("talkback-description", getTalkbackDescription(view));
    }
  }
}
