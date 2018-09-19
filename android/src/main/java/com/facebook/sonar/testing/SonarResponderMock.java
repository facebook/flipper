/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.testing;

import com.facebook.flipper.core.SonarArray;
import com.facebook.flipper.core.SonarObject;
import com.facebook.flipper.core.SonarResponder;
import java.util.LinkedList;
import java.util.List;

public class SonarResponderMock implements SonarResponder {
  public final List<Object> successes = new LinkedList<>();
  public final List<SonarObject> errors = new LinkedList<>();

  @Override
  public void success(SonarObject response) {
    successes.add(response);
  }

  @Override
  public void success(SonarArray response) {
    successes.add(response);
  }

  @Override
  public void success() {
    successes.add(new SonarObject.Builder().build());
  }

  @Override
  public void error(SonarObject response) {
    errors.add(response);
  }
}
