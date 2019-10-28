/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.network;

import com.facebook.flipper.plugins.network.NetworkReporter.ResponseInfo;

public interface NetworkResponseFormatter {

  interface OnCompletionListener {
    void onCompletion(String json);
  }

  boolean shouldFormat(ResponseInfo response);

  void format(ResponseInfo response, OnCompletionListener onCompletionListener);
}
