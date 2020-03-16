/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.testing;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FlipperConnectionMock implements FlipperConnection {
  public final Map<String, FlipperReceiver> receivers = new HashMap<>();
  public final Map<String, List<Object>> sent = new HashMap<>();
  public final List<Throwable> errors = new ArrayList<>();

  @Override
  public void send(String method, FlipperObject params) {
    final List<Object> paramList;
    if (sent.containsKey(method)) {
      paramList = sent.get(method);
    } else {
      paramList = new ArrayList<>();
      sent.put(method, paramList);
    }

    paramList.add(params);
  }

  @Override
  public void send(String method, FlipperArray params) {
    final List<Object> paramList;
    if (sent.containsKey(method)) {
      paramList = sent.get(method);
    } else {
      paramList = new ArrayList<>();
      sent.put(method, paramList);
    }

    paramList.add(params);
  }

  @Override
  public void reportErrorWithMetadata(String reason, String stackTrace) {
    errors.add(new Throwable(reason));
  }

  @Override
  public void reportError(Throwable throwable) {
    errors.add(throwable);
  }

  @Override
  public void receive(String method, FlipperReceiver receiver) {
    receivers.put(method, receiver);
  }
}
