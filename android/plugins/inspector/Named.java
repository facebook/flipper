/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector;

public class Named<ValueType> {
  private final String mName;
  private final ValueType mValue;

  public Named(String name, ValueType value) {
    mName = name;
    mValue = value;
  }

  public String getName() {
    return mName;
  }

  public ValueType getValue() {
    return mValue;
  }
}
