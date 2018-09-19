/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.testing;

import com.facebook.flipper.core.SonarArray;
import com.facebook.flipper.core.SonarConnection;
import com.facebook.flipper.core.SonarObject;
import com.facebook.flipper.core.SonarReceiver;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SonarConnectionMock implements SonarConnection {
  public final Map<String, SonarReceiver> receivers = new HashMap<>();
  public final Map<String, List<Object>> sent = new HashMap<>();

  @Override
  public void send(String method, SonarObject params) {
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
  public void send(String method, SonarArray params) {
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
  public void reportError(Throwable throwable) {}

  @Override
  public void receive(String method, SonarReceiver receiver) {
    receivers.put(method, receiver);
  }
}
