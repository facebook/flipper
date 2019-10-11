/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.view.View;

/**
 * A singleton instance of a overlay drawable used for highlighting node bounds. See {@link
 * NodeDescriptor#setHighlighted(Object, boolean)}.
 */
public class HighlightedOverlay {
  private static final boolean VIEW_OVERLAY_SUPPORT =
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2;

  /**
   * Highlights a particular view with its content bounds, padding and margin dimensions
   *
   * @param targetView The view to apply the highlight on
   * @param margin A {@link Rect} containing the margin values
   * @param padding A {@link Rect} containing the padding values
   * @param contentBounds The {@link Rect} bounds of the content, which includes padding
   */
  public static void setHighlighted(
      View targetView, Rect margin, Rect padding, Rect contentBounds, boolean isAlignmentMode) {
    if (!VIEW_OVERLAY_SUPPORT) {
      return;
    }

    contentBounds.set(
        contentBounds.left + padding.left,
        contentBounds.top + padding.top,
        contentBounds.right - padding.right,
        contentBounds.bottom - padding.bottom);

    padding = enclose(padding, contentBounds);
    margin = enclose(margin, padding);

    final float density = targetView.getContext().getResources().getDisplayMetrics().density;
    final Drawable overlay =
        BoundsDrawable.getInstance(targetView, density, margin, padding, contentBounds);

    targetView.getOverlay().add(overlay);

    if (isAlignmentMode) {
      int[] coords = new int[2];
      targetView.getLocationOnScreen(coords);
      Rect lineContentBounds =
          new Rect(
              coords[0] + contentBounds.left,
              coords[1] + contentBounds.top,
              coords[0] + contentBounds.right,
              coords[1] + contentBounds.bottom);

      final Drawable lineOverlay =
          LinesDrawable.getInstance(targetView, density, margin, padding, lineContentBounds);

      targetView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);

      targetView.getRootView().getOverlay().add(lineOverlay);
    }
  }

  public static void removeHighlight(View targetView) {
    if (!VIEW_OVERLAY_SUPPORT) {
      return;
    }

    final float density = targetView.getContext().getResources().getDisplayMetrics().density;
    final Drawable overlay = BoundsDrawable.getInstance(targetView, density);
    final Drawable overlay2 = LinesDrawable.getInstance(targetView, density);
    targetView.getRootView().getOverlay().remove(overlay2);

    targetView.getOverlay().remove(overlay);
  }

  private static Rect enclose(Rect parent, Rect child) {
    return new Rect(
        child.left - parent.left,
        child.top - parent.top,
        child.right + parent.right,
        child.bottom + parent.bottom);
  }
}
