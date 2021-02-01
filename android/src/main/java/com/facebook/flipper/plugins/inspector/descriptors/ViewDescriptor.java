/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import static com.facebook.flipper.plugins.inspector.InspectorValue.Type.Color;
import static com.facebook.flipper.plugins.inspector.InspectorValue.Type.Enum;

import android.annotation.TargetApi;
import android.graphics.Rect;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.util.SparseArray;
import android.view.Gravity;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;
import android.view.ViewGroup.MarginLayoutParams;
import android.view.ViewParent;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import androidx.core.view.MarginLayoutParamsCompat;
import androidx.core.view.ViewCompat;
import com.facebook.flipper.core.ErrorReportingRunnable;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.HighlightedOverlay;
import com.facebook.flipper.plugins.inspector.InspectorValue;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import com.facebook.flipper.plugins.inspector.descriptors.utils.AccessibilityEvaluationUtil;
import com.facebook.flipper.plugins.inspector.descriptors.utils.AccessibilityRoleUtil;
import com.facebook.flipper.plugins.inspector.descriptors.utils.AccessibilityUtil;
import com.facebook.flipper.plugins.inspector.descriptors.utils.ContextDescriptorUtils;
import com.facebook.flipper.plugins.inspector.descriptors.utils.EnumMapping;
import com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies.ResourcesUtil;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.annotation.Nullable;

public class ViewDescriptor extends NodeDescriptor<View> {

  private static final String axViewPropsTitle = "Accessibility";
  private static final String axNodeInfoPropsTitle = "AccessibilityNodeInfo";
  private static final String axTalkbackPropsTitle = "Talkback";

  private static Field sKeyedTagsField;
  private static Field sListenerInfoField;
  private static Field sOnClickListenerField;

  static {
    try {
      sKeyedTagsField = View.class.getDeclaredField("mKeyedTags");
      sKeyedTagsField.setAccessible(true);

      sListenerInfoField = View.class.getDeclaredField("mListenerInfo");
      sListenerInfoField.setAccessible(true);

      final String viewInfoClassName = View.class.getName() + "$ListenerInfo";
      sOnClickListenerField = Class.forName(viewInfoClassName).getDeclaredField("mOnClickListener");
      sOnClickListenerField.setAccessible(true);
    } catch (Exception ignored) {
    }
  }

  @Override
  public void init(final View node) {}

  @Override
  public String getId(View node) {
    return Integer.toString(System.identityHashCode(node));
  }

  @Override
  public String getName(View node) {
    return node.getClass().getSimpleName();
  }

  @Override
  public String getAXName(View node) throws Exception {
    return node.getClass().getSimpleName();
  }

  @Override
  public int getChildCount(View node) {
    return 0;
  }

  @Override
  public @Nullable Object getChildAt(View node, int index) {
    return null;
  }

  @Override
  public List<Named<FlipperObject>> getData(View node) {
    final int[] positionOnScreen = new int[2];
    node.getLocationOnScreen(positionOnScreen);
    final FlipperObject.Builder viewProps =
        new FlipperObject.Builder()
            .put("height", InspectorValue.mutable(node.getHeight()))
            .put("width", InspectorValue.mutable(node.getWidth()))
            .put("alpha", InspectorValue.mutable(node.getAlpha()))
            .put("visibility", sVisibilityMapping.toPicker(node.getVisibility()))
            .put("background", fromDrawable(node.getBackground()))
            .put("tag", InspectorValue.mutable(node.getTag()))
            .put("keyedTags", getTags(node))
            .put("layoutParams", getLayoutParams(node))
            .put(
                "state",
                new FlipperObject.Builder()
                    .put("enabled", InspectorValue.mutable(node.isEnabled()))
                    .put("activated", InspectorValue.mutable(node.isActivated()))
                    .put("focused", node.isFocused())
                    .put("selected", InspectorValue.mutable(node.isSelected())))
            .put(
                "bounds",
                new FlipperObject.Builder()
                    .put("left", InspectorValue.mutable(node.getLeft()))
                    .put("right", InspectorValue.mutable(node.getRight()))
                    .put("top", InspectorValue.mutable(node.getTop()))
                    .put("bottom", InspectorValue.mutable(node.getBottom())))
            .put(
                "padding",
                new FlipperObject.Builder()
                    .put("left", InspectorValue.mutable(node.getPaddingLeft()))
                    .put("top", InspectorValue.mutable(node.getPaddingTop()))
                    .put("right", InspectorValue.mutable(node.getPaddingRight()))
                    .put("bottom", InspectorValue.mutable(node.getPaddingBottom())))
            .put(
                "rotation",
                new FlipperObject.Builder()
                    .put("x", InspectorValue.mutable(node.getRotationX()))
                    .put("y", InspectorValue.mutable(node.getRotationY()))
                    .put("z", InspectorValue.mutable(node.getRotation())))
            .put(
                "scale",
                new FlipperObject.Builder()
                    .put("x", InspectorValue.mutable(node.getScaleX()))
                    .put("y", InspectorValue.mutable(node.getScaleY())))
            .put(
                "pivot",
                new FlipperObject.Builder()
                    .put("x", InspectorValue.mutable(node.getPivotX()))
                    .put("y", InspectorValue.mutable(node.getPivotY())))
            .put("positionOnScreenX", positionOnScreen[0])
            .put("positionOnScreenY", positionOnScreen[1]);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
      viewProps
          .put("layoutDirection", sLayoutDirectionMapping.toPicker(node.getLayoutDirection()))
          .put("textDirection", sTextDirectionMapping.toPicker(node.getTextDirection()))
          .put("textAlignment", sTextAlignmentMapping.toPicker(node.getTextAlignment()));
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      viewProps.put("elevation", InspectorValue.mutable(node.getElevation()));
    }

    FlipperObject.Builder translation =
        new FlipperObject.Builder()
            .put("x", InspectorValue.mutable(node.getTranslationX()))
            .put("y", InspectorValue.mutable(node.getTranslationY()));
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      translation.put("z", InspectorValue.mutable(node.getTranslationZ()));
    }
    viewProps.put("translation", translation);

    FlipperObject.Builder position =
        new FlipperObject.Builder()
            .put("x", InspectorValue.mutable(node.getX()))
            .put("y", InspectorValue.mutable(node.getY()));
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
      position.put("z", InspectorValue.mutable(node.getZ()));
    }
    viewProps.put("position", position);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      viewProps.put("foreground", fromDrawable(node.getForeground()));
    }

    return Arrays.asList(
        new Named<>("View", viewProps.build()),
        new Named<>("Theme", ContextDescriptorUtils.themeData(node.getContext())));
  }

  @Override
  public List<Named<FlipperObject>> getAXData(View node) {
    return Arrays.asList(
        new Named<>(axNodeInfoPropsTitle, AccessibilityUtil.getAccessibilityNodeInfoData(node)),
        new Named<>(axTalkbackPropsTitle, AccessibilityUtil.getTalkbackData(node)),
        new Named<>(axViewPropsTitle, AccessibilityUtil.getViewData(node)));
  }

  @TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR1)
  @Override
  public void setValue(
      View node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value) {
    if (path[0].equals(axViewPropsTitle)
        || path[0].equals(axNodeInfoPropsTitle)
        || path[0].equals(axTalkbackPropsTitle)) {
      setAccessibilityValue(node, path, value);
      return;
    }

    if (!path[0].equals("View")) {
      return;
    }

    switch (path[1]) {
      case "elevation":
        node.setElevation(value.asFloat());
        break;
      case "alpha":
        node.setAlpha(value.asFloat());
        break;
      case "visibility":
        node.setVisibility(sVisibilityMapping.get(value.asString()));
        break;
      case "layoutParams":
        // path is [view, layoutParams, value] and we only want the values
        if (path.length > 2) {
          setLayoutParams(node, Arrays.copyOfRange(path, 2, path.length), value);
        }
        break;
      case "layoutDirection":
        node.setLayoutDirection(sLayoutDirectionMapping.get(value.asString()));
        break;
      case "textDirection":
        node.setTextDirection(sTextDirectionMapping.get(value.asString()));
        break;
      case "textAlignment":
        node.setTextAlignment(sTextAlignmentMapping.get(value.asString()));
        break;
      case "background":
        node.setBackground(new ColorDrawable(value.asInt()));
        break;
      case "foreground":
        node.setForeground(new ColorDrawable(value.asInt()));
        break;
      case "state":
        switch (path[2]) {
          case "enabled":
            node.setEnabled(value.asBoolean());
            break;
          case "activated":
            node.setActivated(value.asBoolean());
            break;
          case "selected":
            node.setSelected(value.asBoolean());
            break;
        }
        break;
      case "bounds":
        switch (path[2]) {
          case "left":
            node.setLeft(value.asInt());
            break;
          case "top":
            node.setTop(value.asInt());
            break;
          case "right":
            node.setRight(value.asInt());
            break;
          case "bottom":
            node.setBottom(value.asInt());
            break;
        }
        break;
      case "padding":
        switch (path[2]) {
          case "left":
            node.setPadding(
                value.asInt(),
                node.getPaddingTop(),
                node.getPaddingRight(),
                node.getPaddingBottom());
            break;
          case "top":
            node.setPadding(
                node.getPaddingLeft(),
                value.asInt(),
                node.getPaddingRight(),
                node.getPaddingBottom());
            break;
          case "right":
            node.setPadding(
                node.getPaddingLeft(),
                node.getPaddingTop(),
                value.asInt(),
                node.getPaddingBottom());
            break;
          case "bottom":
            node.setPadding(
                node.getPaddingLeft(), node.getPaddingTop(), node.getPaddingRight(), value.asInt());
            break;
        }
        break;
      case "rotation":
        switch (path[2]) {
          case "x":
            node.setRotationX(value.asFloat());
            break;
          case "y":
            node.setRotationY(value.asFloat());
            break;
          case "z":
            node.setRotation(value.asFloat());
            break;
        }
        break;
      case "translation":
        switch (path[2]) {
          case "x":
            node.setTranslationX(value.asFloat());
            break;
          case "y":
            node.setTranslationY(value.asFloat());
            break;
          case "z":
            node.setTranslationZ(value.asFloat());
            break;
        }
        break;
      case "position":
        switch (path[2]) {
          case "x":
            node.setX(value.asFloat());
            break;
          case "y":
            node.setY(value.asFloat());
            break;
          case "z":
            node.setZ(value.asFloat());
            break;
        }
        break;
      case "scale":
        switch (path[2]) {
          case "x":
            node.setScaleX(value.asFloat());
            break;
          case "y":
            node.setScaleY(value.asFloat());
            break;
        }
        break;
      case "pivot":
        switch (path[2]) {
          case "x":
            node.setPivotY(value.asFloat());
            break;
          case "y":
            node.setPivotX(value.asFloat());
            break;
        }
        break;
      case "width":
        LayoutParams lpw = node.getLayoutParams();
        lpw.width = value.asInt();
        node.setLayoutParams(lpw);
        break;
      case "height":
        LayoutParams lph = node.getLayoutParams();
        lph.height = value.asInt();
        node.setLayoutParams(lph);
        break;
    }

    invalidate(node);
  }

  private void setAccessibilityValue(View node, String[] path, FlipperDynamic value) {
    switch (path[1]) {
      case "focusable":
        node.setFocusable(value.asBoolean());
        break;
      case "important-for-accessibility":
        node.setImportantForAccessibility(
            AccessibilityUtil.sImportantForAccessibilityMapping.get(value.asString()));
        break;
      case "content-description":
        node.setContentDescription(value.asString());
        break;
      case "long-clickable":
        node.setLongClickable(value.asBoolean());
        break;
      case "clickable":
        node.setClickable(value.asBoolean());
        break;
      case "selected":
        node.setSelected(value.asBoolean());
        break;
      case "enabled":
        node.setEnabled(value.asBoolean());
        break;
    }
    invalidateAX(node);
  }

  @Override
  public List<Named<String>> getAttributes(View node) throws Exception {
    final List<Named<String>> attributes = new ArrayList<>();

    final String resourceId = getResourceId(node);
    if (resourceId != null) {
      attributes.add(new Named<>("id", resourceId));
    }

    if (sListenerInfoField != null && sOnClickListenerField != null) {
      final Object listenerInfo = sListenerInfoField.get(node);
      if (listenerInfo != null) {
        final OnClickListener clickListener =
            (OnClickListener) sOnClickListenerField.get(listenerInfo);
        if (clickListener != null) {
          attributes.add(new Named<>("onClick", clickListener.getClass().getName()));
        }
      }
    }

    return attributes;
  }

  @Override
  public List<Named<String>> getAXAttributes(View node) throws Exception {
    List<Named<String>> attributes = new ArrayList<>();
    String role = AccessibilityRoleUtil.getRole(node).toString();
    if (!role.equals("NONE")) {
      attributes.add(new Named<>("role", role));
    }
    return attributes;
  }

  @Override
  public FlipperObject getExtraInfo(View node) {
    // Views of all kinds are their own linked node because they show up in both the ax and non-ax
    // tree
    return new FlipperObject.Builder().put("linkedNode", getId(node)).build();
  }

  @Nullable
  private static String getResourceId(View node) {
    final int id = node.getId();

    if (id == View.NO_ID) {
      return null;
    }

    return ResourcesUtil.getIdStringQuietly(node.getContext(), node.getResources(), id);
  }

  @Override
  public void setHighlighted(View node, boolean selected, boolean isAlignmentMode) {
    // We need to figure out whether the given View has a parent View since margins are not
    // included within a View's bounds. So, in order to display the margin values for a particular
    // view, we need to apply an overlay on its parent rather than itself.
    final View targetView;
    final ViewParent parent = node.getParent();
    if (parent instanceof View) {
      targetView = (View) parent;
    } else {
      targetView = node;
    }

    if (!selected) {
      HighlightedOverlay.removeHighlight(targetView);
      return;
    }

    final Rect padding =
        new Rect(
            ViewCompat.getPaddingStart(node),
            node.getPaddingTop(),
            ViewCompat.getPaddingEnd(node),
            node.getPaddingBottom());

    final Rect margin;
    final ViewGroup.LayoutParams params = node.getLayoutParams();
    if (params instanceof ViewGroup.MarginLayoutParams) {
      final ViewGroup.MarginLayoutParams marginParams = (ViewGroup.MarginLayoutParams) params;
      margin =
          new Rect(
              MarginLayoutParamsCompat.getMarginStart(marginParams),
              marginParams.topMargin,
              MarginLayoutParamsCompat.getMarginEnd(marginParams),
              marginParams.bottomMargin);
    } else {
      margin = new Rect();
    }

    final int left = node.getLeft();
    final int top = node.getTop();
    final Rect contentBounds = new Rect(left, top, left + node.getWidth(), top + node.getHeight());
    if (targetView == node) {
      // If the View doesn't have a parent View that we're applying the overlay to, then
      // we need to ensure that it is aligned to 0, 0, rather than its relative location to its
      // parent
      contentBounds.offset(-left, -top);
    }

    HighlightedOverlay.setHighlighted(targetView, margin, padding, contentBounds, isAlignmentMode);
  }

  @Override
  public void hitTest(View node, Touch touch) {
    touch.finish();
  }

  @Override
  public void axHitTest(View node, Touch touch) {
    touch.finish();
  }

  @Override
  public @Nullable String getDecoration(View obj) {
    return null;
  }

  @Override
  public String getAXDecoration(View obj) {
    return AccessibilityEvaluationUtil.isTalkbackFocusable(obj) ? "accessibility" : "";
  }

  @Override
  public boolean matches(String query, View node) throws Exception {
    final String resourceId = getResourceId(node);

    if (resourceId != null && resourceId.toLowerCase().contains(query)) {
      return true;
    }

    final NodeDescriptor objectDescriptor = descriptorForClass(Object.class);
    return objectDescriptor.matches(query, node);
  }

  private FlipperObject getTags(final View node) {
    final FlipperObject.Builder tags = new FlipperObject.Builder();
    if (sKeyedTagsField == null) {
      return tags.build();
    }

    if (mConnection != null) {
      new ErrorReportingRunnable(mConnection) {
        @Override
        protected void runOrThrow() throws Exception {
          final SparseArray keyedTags = (SparseArray) sKeyedTagsField.get(node);
          if (keyedTags != null) {
            for (int i = 0, count = keyedTags.size(); i < count; i++) {
              final String id =
                  ResourcesUtil.getIdStringQuietly(
                      node.getContext(), node.getResources(), keyedTags.keyAt(i));
              tags.put(id, keyedTags.valueAt(i));
            }
          }
        }
      }.run();
    }

    return tags.build();
  }

  private static InspectorValue fromDrawable(Drawable d) {
    if (d instanceof ColorDrawable) {
      return InspectorValue.mutable(Color, ((ColorDrawable) d).getColor());
    }
    return InspectorValue.mutable(Color, 0);
  }

  private static FlipperObject getLayoutParams(View node) {
    final LayoutParams layoutParams = node.getLayoutParams();
    final FlipperObject.Builder params = new FlipperObject.Builder();

    params.put("width", fromSize(layoutParams.width));
    params.put("height", fromSize(layoutParams.height));

    if (layoutParams instanceof MarginLayoutParams) {
      final MarginLayoutParams marginLayoutParams = (MarginLayoutParams) layoutParams;
      params.put(
          "margin",
          new FlipperObject.Builder()
              .put("left", InspectorValue.mutable(marginLayoutParams.leftMargin))
              .put("top", InspectorValue.mutable(marginLayoutParams.topMargin))
              .put("right", InspectorValue.mutable(marginLayoutParams.rightMargin))
              .put("bottom", InspectorValue.mutable(marginLayoutParams.bottomMargin)));
    }

    if (layoutParams instanceof FrameLayout.LayoutParams) {
      final FrameLayout.LayoutParams frameLayoutParams = (FrameLayout.LayoutParams) layoutParams;
      params.put("gravity", sGravityMapping.toPicker(frameLayoutParams.gravity));
    }

    if (layoutParams instanceof LinearLayout.LayoutParams) {
      final LinearLayout.LayoutParams linearLayoutParams = (LinearLayout.LayoutParams) layoutParams;
      params
          .put("weight", InspectorValue.mutable(linearLayoutParams.weight))
          .put("gravity", sGravityMapping.toPicker(linearLayoutParams.gravity));
    }

    return params.build();
  }

  private void setLayoutParams(View node, String[] path, FlipperDynamic value) {
    final LayoutParams params = node.getLayoutParams();

    switch (path[0]) {
      case "width":
        params.width = toSize(value.asString());
        break;
      case "height":
        params.height = toSize(value.asString());
        break;
      case "weight":
        final LinearLayout.LayoutParams linearParams = (LinearLayout.LayoutParams) params;
        linearParams.weight = value.asFloat();
        break;
    }

    if (params instanceof MarginLayoutParams) {
      final MarginLayoutParams marginParams = (MarginLayoutParams) params;

      switch (path[0]) {
        case "margin":
          switch (path[1]) {
            case "left":
              marginParams.leftMargin = value.asInt();
              break;
            case "top":
              marginParams.topMargin = value.asInt();
              break;
            case "right":
              marginParams.rightMargin = value.asInt();
              break;
            case "bottom":
              marginParams.bottomMargin = value.asInt();
              break;
          }
          break;
      }
    }

    if (params instanceof FrameLayout.LayoutParams) {
      final FrameLayout.LayoutParams frameLayoutParams = (FrameLayout.LayoutParams) params;

      switch (path[0]) {
        case "gravity":
          frameLayoutParams.gravity = sGravityMapping.get(value.asString());
          break;
      }
    }

    if (params instanceof LinearLayout.LayoutParams) {
      final LinearLayout.LayoutParams linearParams = (LinearLayout.LayoutParams) params;

      switch (path[0]) {
        case "weight":
          linearParams.weight = value.asFloat();
          break;
        case "gravity":
          linearParams.gravity = sGravityMapping.get(value.asString());
          break;
      }
    }

    node.setLayoutParams(params);
  }

  private static InspectorValue fromSize(int size) {
    switch (size) {
      case LayoutParams.WRAP_CONTENT:
        return InspectorValue.mutable(Enum, "WRAP_CONTENT");
      case LayoutParams.MATCH_PARENT:
        return InspectorValue.mutable(Enum, "MATCH_PARENT");
      default:
        return InspectorValue.mutable(Enum, Integer.toString(size));
    }
  }

  private static int toSize(String size) {
    switch (size) {
      case "WRAP_CONTENT":
        return LayoutParams.WRAP_CONTENT;
      case "MATCH_PARENT":
        return LayoutParams.MATCH_PARENT;
      default:
        return Integer.parseInt(size);
    }
  }

  private static final EnumMapping<Integer> sVisibilityMapping =
      new EnumMapping<Integer>("VISIBLE") {
        {
          put("VISIBLE", View.VISIBLE);
          put("INVISIBLE", View.INVISIBLE);
          put("GONE", View.GONE);
        }
      };

  private static final EnumMapping<Integer> sLayoutDirectionMapping =
      new EnumMapping<Integer>("LAYOUT_DIRECTION_INHERIT") {
        {
          put("LAYOUT_DIRECTION_INHERIT", View.LAYOUT_DIRECTION_INHERIT);
          put("LAYOUT_DIRECTION_LOCALE", View.LAYOUT_DIRECTION_LOCALE);
          put("LAYOUT_DIRECTION_LTR", View.LAYOUT_DIRECTION_LTR);
          put("LAYOUT_DIRECTION_RTL", View.LAYOUT_DIRECTION_RTL);
        }
      };

  private static final EnumMapping<Integer> sTextDirectionMapping =
      new EnumMapping<Integer>("TEXT_DIRECTION_INHERIT") {
        {
          put("TEXT_DIRECTION_INHERIT", View.TEXT_DIRECTION_INHERIT);
          put("TEXT_DIRECTION_FIRST_STRONG", View.TEXT_DIRECTION_FIRST_STRONG);
          put("TEXT_DIRECTION_ANY_RTL", View.TEXT_DIRECTION_ANY_RTL);
          put("TEXT_DIRECTION_LTR", View.TEXT_DIRECTION_LTR);
          put("TEXT_DIRECTION_RTL", View.TEXT_DIRECTION_RTL);
          put("TEXT_DIRECTION_LOCALE", View.TEXT_DIRECTION_LOCALE);
          put("TEXT_DIRECTION_FIRST_STRONG_LTR", View.TEXT_DIRECTION_FIRST_STRONG_LTR);
          put("TEXT_DIRECTION_FIRST_STRONG_RTL", View.TEXT_DIRECTION_FIRST_STRONG_RTL);
        }
      };

  private static final EnumMapping<Integer> sTextAlignmentMapping =
      new EnumMapping<Integer>("TEXT_ALIGNMENT_INHERIT") {
        {
          put("TEXT_ALIGNMENT_INHERIT", View.TEXT_ALIGNMENT_INHERIT);
          put("TEXT_ALIGNMENT_GRAVITY", View.TEXT_ALIGNMENT_GRAVITY);
          put("TEXT_ALIGNMENT_TEXT_START", View.TEXT_ALIGNMENT_TEXT_START);
          put("TEXT_ALIGNMENT_TEXT_END", View.TEXT_ALIGNMENT_TEXT_END);
          put("TEXT_ALIGNMENT_CENTER", View.TEXT_ALIGNMENT_CENTER);
          put("TEXT_ALIGNMENT_VIEW_START", View.TEXT_ALIGNMENT_VIEW_START);
          put("TEXT_ALIGNMENT_VIEW_END", View.TEXT_ALIGNMENT_VIEW_END);
        }
      };

  private static final EnumMapping<Integer> sGravityMapping =
      new EnumMapping<Integer>("NO_GRAVITY") {
        {
          put("NO_GRAVITY", Gravity.NO_GRAVITY);
          put("LEFT", Gravity.LEFT);
          put("TOP", Gravity.TOP);
          put("RIGHT", Gravity.RIGHT);
          put("BOTTOM", Gravity.BOTTOM);
          put("CENTER", Gravity.CENTER);
          put("CENTER_VERTICAL", Gravity.CENTER_VERTICAL);
          put("FILL_VERTICAL", Gravity.FILL_VERTICAL);
          put("CENTER_HORIZONTAL", Gravity.CENTER_HORIZONTAL);
          put("FILL_HORIZONTAL", Gravity.FILL_HORIZONTAL);
        }
      };
}
