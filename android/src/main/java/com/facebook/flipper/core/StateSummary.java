/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

import java.util.ArrayList;
import java.util.List;

public class StateSummary {

  public enum State {
    IN_PROGRESS,
    SUCCESS,
    FAILED,
    UNKNOWN;
  }

  public static class StateElement {
    private final String mName;
    private final State mState;

    public StateElement(String name, State state) {
      mName = name;
      mState = state;
    }

    public String getName() {
      return mName;
    }

    public State getState() {
      return mState;
    }
  }

  public final List<StateElement> mList = new ArrayList<>();

  public void addEntry(String name, String state) {
    State s;
    try {
      s = State.valueOf(state);
    } catch (RuntimeException e) {
      s = State.UNKNOWN;
    }
    mList.add(new StateElement(name, s));
  }
}
