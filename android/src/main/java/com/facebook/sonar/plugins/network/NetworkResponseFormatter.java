/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.network;

import com.facebook.sonar.plugins.network.NetworkReporter.ResponseInfo;

public interface NetworkResponseFormatter {

  interface OnCompletionListener {
    void onCompletion(String json);
  }

  boolean shouldFormat(ResponseInfo response);

  void format(ResponseInfo response, OnCompletionListener onCompletionListener);
}
