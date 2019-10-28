/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

public class StateElement {
  private final String mName;
  private final String mState;

  public StateElement(String name, String state) {
    mName = name;
    mState = state;
  }

  public String getName() {
    return mName;
  }
}
