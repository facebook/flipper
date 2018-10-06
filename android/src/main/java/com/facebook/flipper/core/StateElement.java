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
