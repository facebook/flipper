/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.testing;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperResponder;
import java.util.LinkedList;
import java.util.List;

public class FlipperResponderMock implements FlipperResponder {
  public final List<Object> successes = new LinkedList<>();
  public final List<FlipperObject> errors = new LinkedList<>();

  @Override
  public void success(FlipperObject response) {
    successes.add(response);
  }

  @Override
  public void success(FlipperArray response) {
    successes.add(response);
  }

  @Override
  public void success() {
    successes.add(new FlipperObject.Builder().build());
  }

  @Override
  public void error(FlipperObject response) {
    errors.add(response);
  }
}
