/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.network;

public interface NetworkRequestFormatter {
  interface OnCompletionListener {
    void onCompletion(String json);
  }

  boolean shouldFormat(NetworkReporter.RequestInfo request);

  void format(NetworkReporter.RequestInfo request, OnCompletionListener onCompletionListener);
}
