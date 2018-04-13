/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.Region;
import android.graphics.drawable.Drawable;
import android.text.TextPaint;
import javax.annotation.Nullable;

public class BoundsDrawable extends Drawable {
  public static final int COLOR_HIGHLIGHT_CONTENT = 0x888875c5;
  public static final int COLOR_HIGHLIGHT_PADDING = 0x889dd185;
  public static final int COLOR_HIGHLIGHT_MARGIN = 0x88f7b77b;
  private static @Nullable BoundsDrawable sInstance;

  private final TextPaint mTextPaint;
  private final Paint mMarginPaint;
  private final Paint mPaddingPaint;
  private final Paint mContentPaint;
  private final Rect mWorkRect;
  private final Rect mMarginBounds;
  private final Rect mPaddingBounds;
  private final Rect mContentBounds;

  private final int mStrokeWidth;
  private final float mAscentOffset;
  private final float mDensity;

  public static BoundsDrawable getInstance(
      float density, Rect marginBounds, Rect paddingBounds, Rect contentBounds) {
    final BoundsDrawable drawable = getInstance(density);
    drawable.setBounds(marginBounds, paddingBounds, contentBounds);
    return drawable;
  }

  public static BoundsDrawable getInstance(float density) {
    if (sInstance == null) {
      sInstance = new BoundsDrawable(density);
    }
    return sInstance;
  }

  private BoundsDrawable(float density) {
    mWorkRect = new Rect();
    mMarginBounds = new Rect();
    mPaddingBounds = new Rect();
    mContentBounds = new Rect();

    mDensity = density;

    mTextPaint = new TextPaint();
    mTextPaint.setAntiAlias(true);
    mTextPaint.setTextAlign(Paint.Align.CENTER);
    mTextPaint.setTextSize(dpToPx(8f));
    mAscentOffset = -mTextPaint.ascent() / 2f;
    mStrokeWidth = dpToPx(2f);

    mPaddingPaint = new Paint();
    mPaddingPaint.setStyle(Paint.Style.FILL);
    mPaddingPaint.setColor(COLOR_HIGHLIGHT_PADDING);

    mContentPaint = new Paint();
    mContentPaint.setStyle(Paint.Style.FILL);
    mContentPaint.setColor(COLOR_HIGHLIGHT_CONTENT);

    mMarginPaint = new Paint();
    mMarginPaint.setStyle(Paint.Style.FILL);
    mMarginPaint.setColor(COLOR_HIGHLIGHT_MARGIN);
  }

  public void setBounds(Rect marginBounds, Rect paddingBounds, Rect contentBounds) {
    mMarginBounds.set(marginBounds);
    mPaddingBounds.set(paddingBounds);
    mContentBounds.set(contentBounds);
    setBounds(marginBounds);
  }

  @Override
  public void draw(Canvas canvas) {
    canvas.drawRect(mContentBounds, mContentPaint);

    int saveCount = canvas.save();
    canvas.clipRect(mContentBounds, Region.Op.DIFFERENCE);
    canvas.drawRect(mPaddingBounds, mPaddingPaint);
    canvas.restoreToCount(saveCount);

    saveCount = canvas.save();
    canvas.clipRect(mPaddingBounds, Region.Op.DIFFERENCE);
    canvas.drawRect(mMarginBounds, mMarginPaint);
    canvas.restoreToCount(saveCount);

    drawBoundsDimensions(canvas, mContentBounds);

    // Disabled for now since Sonar doesn't support options too well at this point in time.
    // Once options are supported, we should re-enable the calls below
    // drawCardinalDimensionsBetween(canvas, mContentBounds, mPaddingBounds);
    // drawCardinalDimensionsBetween(canvas, mPaddingBounds, mMarginBounds);
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

  private void drawCardinalDimensionsBetween(Canvas canvas, Rect inner, Rect outer) {
    mWorkRect.set(inner);
    mWorkRect.left = outer.left;
    mWorkRect.right = inner.left;
    drawBoundsDimension(canvas, mWorkRect, mWorkRect.width());
    mWorkRect.left = inner.right;
    mWorkRect.right = outer.right;
    drawBoundsDimension(canvas, mWorkRect, mWorkRect.width());
    mWorkRect.set(outer);
    mWorkRect.bottom = inner.top;
    drawBoundsDimension(canvas, mWorkRect, mWorkRect.height());
    mWorkRect.bottom = outer.bottom;
    mWorkRect.top = inner.bottom;
    drawBoundsDimension(canvas, mWorkRect, mWorkRect.height());
  }

  private void drawBoundsDimension(Canvas canvas, Rect bounds, int value) {
    if (value <= 0) {
      return;
    }
    int saveCount = canvas.save();
    canvas.translate(bounds.centerX(), bounds.centerY());
    drawOutlinedText(canvas, value + "px");
    canvas.restoreToCount(saveCount);
  }

  private void drawBoundsDimensions(Canvas canvas, Rect bounds) {
    int saveCount = canvas.save();
    canvas.translate(bounds.centerX(), bounds.centerY());
    drawOutlinedText(canvas, bounds.width() + "px  \u00D7  " + bounds.height() + "px");
    canvas.restoreToCount(saveCount);
  }

  private void drawOutlinedText(Canvas canvas, String text) {
    mTextPaint.setColor(Color.BLACK);
    mTextPaint.setStrokeWidth(mStrokeWidth);
    mTextPaint.setStyle(Paint.Style.STROKE);
    canvas.drawText(text, 0f, mAscentOffset, mTextPaint);

    mTextPaint.setColor(Color.WHITE);
    mTextPaint.setStrokeWidth(0f);
    mTextPaint.setStyle(Paint.Style.FILL);
    canvas.drawText(text, 0f, mAscentOffset, mTextPaint);
  }

  private int dpToPx(float dp) {
    return (int) (dp * mDensity);
  }
}
