/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import android.graphics.Canvas;
import android.graphics.ColorFilter;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.view.View;
import java.util.Map;
import java.util.WeakHashMap;
import javax.annotation.Nullable;

public class LinesDrawable extends Drawable {

  private final Rect mWorkRect;
  private final Rect mMarginBounds;
  private final Rect mPaddingBounds;
  private final Rect mContentBounds;

  private final float mDensity;
  private static @Nullable Map<View, LinesDrawable> sInstanceMap;

  public static LinesDrawable getInstance(
      View view, float density, Rect marginBounds, Rect paddingBounds, Rect contentBounds) {
    final LinesDrawable drawable = getInstance(view, density);
    drawable.setBounds(marginBounds, paddingBounds, contentBounds);
    return drawable;
  }

  public static LinesDrawable getInstance(View view, float density) {
    if (sInstanceMap == null) {
      sInstanceMap = new WeakHashMap<>();
    }

    if (sInstanceMap.containsKey(view)) {
      return sInstanceMap.get(view);
    }

    LinesDrawable drawable = new LinesDrawable(density);
    sInstanceMap.put(view, drawable);
    return drawable;
  }

  private LinesDrawable(float density) {
    mWorkRect = new Rect();
    mMarginBounds = new Rect();
    mPaddingBounds = new Rect();
    mContentBounds = new Rect();

    mDensity = density;
  }

  public void setBounds(Rect marginBounds, Rect paddingBounds, Rect contentBounds) {
    mMarginBounds.set(marginBounds);
    mPaddingBounds.set(paddingBounds);
    mContentBounds.set(contentBounds);
    setBounds(marginBounds);
  }

  @Override
  public void draw(Canvas canvas) {

    Paint dashPaint = new Paint();
    dashPaint.setColor(0xFF800000);
    dashPaint.setStyle(Paint.Style.STROKE);
    dashPaint.setStrokeWidth(3);
    dashPaint.setPathEffect(new DashPathEffect(new float[] {10, 10}, 0));

    canvas.drawLine(mContentBounds.right, 0, mContentBounds.right, 100000, dashPaint);
    canvas.drawLine(mContentBounds.left, 0, mContentBounds.left, 100000, dashPaint);
    canvas.drawLine(0, mContentBounds.top, 100000, mContentBounds.top, dashPaint);
    canvas.drawLine(0, mContentBounds.bottom, 100000, mContentBounds.bottom, dashPaint);
  }

  @Override
  public void setAlpha(int alpha) {
    // No-op
  }

  @Override
  public void setColorFilter(ColorFilter colorFilter) {
    // No-op
  }

  @Override
  public int getOpacity() {
    return PixelFormat.TRANSLUCENT;
  }
}
