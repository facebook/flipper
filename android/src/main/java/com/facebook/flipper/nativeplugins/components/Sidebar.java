/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.components;

import com.facebook.flipper.core.FlipperArray;

public class Sidebar {

  private final FlipperArray.Builder sections = new FlipperArray.Builder();

  public Sidebar addSection(UISection section) {
    sections.put(section.serialize());
    return this;
  }

  public FlipperArray serialize() {
    return sections.build();
  }
}
