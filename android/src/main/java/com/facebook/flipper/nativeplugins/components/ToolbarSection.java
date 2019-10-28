/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.components;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;

public class ToolbarSection implements UISection {
  private FlipperArray.Builder items = new FlipperArray.Builder();

  public ToolbarSection addLink(String label, String destination) {
    items.put(
        new FlipperObject.Builder()
            .put("type", "link")
            .put("label", label)
            .put("destination", destination));
    return this;
  }

  @Override
  public FlipperObject serialize() {
    return new FlipperObject.Builder().put("type", "toolbar").put("items", items.build()).build();
  }
}
