/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import static android.view.View.MeasureSpec.EXACTLY;
import static android.view.View.MeasureSpec.makeMeasureSpec;
import static org.mockito.ArgumentMatchers.anyInt;

import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.facebook.flipper.plugins.inspector.Touch;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

@RunWith(RobolectricTestRunner.class)
public class ViewGroupDescriptorTest {

  @Test
  public void testHitTestVisibleChild() {
    final ViewGroupDescriptor descriptor = new ViewGroupDescriptor();

    final ViewGroup root = new FrameLayout(RuntimeEnvironment.application);
    final View child = new View(RuntimeEnvironment.application);
    root.addView(child);

    root.measure(makeMeasureSpec(100, EXACTLY), makeMeasureSpec(100, EXACTLY));
    root.layout(0, 0, 100, 100);

    final Touch touch = Mockito.mock(Touch.class);
    Mockito.when(touch.containedIn(anyInt(), anyInt(), anyInt(), anyInt())).thenReturn(true);
    descriptor.hitTest(root, touch);
    Mockito.verify(touch, Mockito.times(1)).continueWithOffset(0, 0, 0);
  }

  @Test
  public void testHitTestInvisibleChild() {
    final ViewGroupDescriptor descriptor = new ViewGroupDescriptor();

    final ViewGroup root = new FrameLayout(RuntimeEnvironment.application);
    final View child = new View(RuntimeEnvironment.application);
    child.setVisibility(View.GONE);
    root.addView(child);

    root.measure(makeMeasureSpec(100, EXACTLY), makeMeasureSpec(100, EXACTLY));
    root.layout(0, 0, 100, 100);

    final Touch touch = Mockito.mock(Touch.class);
    Mockito.when(touch.containedIn(anyInt(), anyInt(), anyInt(), anyInt())).thenReturn(true);
    descriptor.hitTest(root, touch);
    Mockito.verify(touch, Mockito.times(1)).finish();
  }
}
