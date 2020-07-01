/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import android.content.Context;
import android.util.Pair;
import android.view.MotionEvent;
import android.view.View;
import com.facebook.flipper.core.ErrorReportingRunnable;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.descriptors.utils.AccessibilityUtil;
import java.util.Iterator;
import java.util.Stack;

abstract class TouchOverlayView extends View implements HiddenNode {

  private final FlipperConnection mConnection;

  private final ApplicationWrapper mApplication;

  public TouchOverlayView(
      Context context, FlipperConnection connection, ApplicationWrapper wrapper) {
    super(context);
    mConnection = connection;
    mApplication = wrapper;
    setBackgroundColor(BoundsDrawable.COLOR_HIGHLIGHT_CONTENT);
  }

  protected abstract String trackObject(Object obj) throws Exception;

  protected abstract NodeDescriptor<Object> descriptorForObject(Object obj);

  @Override
  public boolean onHoverEvent(MotionEvent event) {

    // if in layout inspector and talkback is running, override the first click to locate the
    // clicked view
    if (mConnection != null
        && AccessibilityUtil.isTalkbackEnabled(getContext())
        && event.getPointerCount() == 1) {
      FlipperObject params =
          new FlipperObject.Builder()
              .put("type", "usage")
              .put("eventName", "accessibility:clickToInspectTalkbackRunning")
              .build();
      mConnection.send("track", params);

      final int action = event.getAction();
      switch (action) {
        case MotionEvent.ACTION_HOVER_ENTER:
          {
            event.setAction(MotionEvent.ACTION_DOWN);
          }
          break;
        case MotionEvent.ACTION_HOVER_MOVE:
          {
            event.setAction(MotionEvent.ACTION_MOVE);
          }
          break;
        case MotionEvent.ACTION_HOVER_EXIT:
          {
            event.setAction(MotionEvent.ACTION_UP);
          }
          break;
      }
      return onTouchEvent(event);
    }

    // otherwise use the default
    return super.onHoverEvent(event);
  }

  @Override
  public boolean onTouchEvent(final MotionEvent event) {
    if (event.getAction() != MotionEvent.ACTION_UP) {
      return true;
    }

    new ErrorReportingRunnable(mConnection) {
      @Override
      public void runOrThrow() throws Exception {
        hitTest((int) event.getX(), (int) event.getY());
      }
    }.run();

    return true;
  }

  void hitTest(final int touchX, final int touchY) throws Exception {
    final NodeDescriptor<Object> descriptor = descriptorForObject(mApplication);
    FlipperObject treeObj;

    Pair<Touch, Stack<FlipperObject.Builder>> pair = createTouch(touchX, touchY, false);
    descriptor.hitTest(mApplication, pair.first);
    treeObj = new FlipperObject.Builder().put(trackObject(mApplication), pair.second.pop()).build();
    mConnection.send(
        "select",
        new FlipperObject.Builder()
            .put("tree", treeObj)
            .put("path", getPathFromTree(treeObj))
            .build());

    pair = createTouch(touchX, touchY, true);
    descriptor.axHitTest(mApplication, pair.first);
    treeObj = new FlipperObject.Builder().put(trackObject(mApplication), pair.second.pop()).build();
    mConnection.send(
        "selectAX",
        new FlipperObject.Builder()
            .put("tree", treeObj)
            .put("path", getPathFromTree(treeObj))
            .build());
  }

  private Pair<Touch, Stack<FlipperObject.Builder>> createTouch(
      final int touchX, final int touchY, final boolean ax) throws Exception {
    final Stack<FlipperObject.Builder> objStack = new Stack<>();
    objStack.push(new FlipperObject.Builder());

    final Stack<Object> nodes = new Stack<>();
    nodes.push(mApplication);

    final Touch touch =
        new Touch() {
          int x = touchX;
          int y = touchY;

          @Override
          public void finish() {}

          @Override
          public void continueWithOffset(
              final int childIndex, final int offsetX, final int offsetY) {
            final Touch touch = this;

            new ErrorReportingRunnable(mConnection) {
              @Override
              protected void runOrThrow() throws Exception {
                Object nextNode;
                final Object currNode = nodes.peek();
                x -= offsetX;
                y -= offsetY;

                if (ax) {
                  nextNode =
                      InspectorFlipperPlugin.assertNotNull(
                          descriptorForObject(currNode).getAXChildAt(currNode, childIndex));
                } else {
                  nextNode =
                      InspectorFlipperPlugin.assertNotNull(
                          descriptorForObject(currNode).getChildAt(currNode, childIndex));
                }

                nodes.push(nextNode);
                final String nodeID = trackObject(nextNode);
                final NodeDescriptor<Object> descriptor = descriptorForObject(nextNode);
                objStack.push(new FlipperObject.Builder());

                if (ax) {
                  descriptor.axHitTest(nextNode, touch);
                } else {
                  descriptor.hitTest(nextNode, touch);
                }

                x += offsetX;
                y += offsetY;
                nodes.pop();
                final FlipperObject objTree = objStack.pop().build();
                objStack.peek().put(nodeID, objTree);
              }
            }.run();
          }

          @Override
          public boolean containedIn(int l, int t, int r, int b) {
            return x >= l && x <= r && y >= t && y <= b;
          }
        };

    return new Pair<>(touch, objStack);
  }

  // This is mainly for backward compatibility
  private FlipperArray getPathFromTree(FlipperObject tree) {
    final FlipperArray.Builder pathBuilder = new FlipperArray.Builder();
    FlipperObject subtree = tree;
    Iterator<String> it = subtree.keys();
    while (it.hasNext()) {
      final String key = it.next();
      pathBuilder.put(key);
      subtree = subtree.getObject(key);
      it = subtree.keys();
    }
    return pathBuilder.build();
  }
}
