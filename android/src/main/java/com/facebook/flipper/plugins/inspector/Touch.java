/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

/**
 * Used to collect the path from the root node to the node at point [x, y]. This is used for
 * creating a node path to the targeting node from the root when performing hit testing.
 */
public interface Touch {

  /**
   * Call this when the path has reached its destination. This should be called from the descriptor
   * which described the leaf node containing [x, y].
   */
  void finish();

  /**
   * Continue hit testing in child at the given index. Offseting the touch location to the child's
   * coordinate system.
   */
  void continueWithOffset(int childIndex, int offsetX, int offsetY);

  /**
   * @return Whether or not this Touch is contained within the provided bounds.
   */
  boolean containedIn(int l, int t, int r, int b);
}
