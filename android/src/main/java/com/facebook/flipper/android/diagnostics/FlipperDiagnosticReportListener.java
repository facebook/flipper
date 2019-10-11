/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android.diagnostics;

import com.facebook.flipper.core.FlipperClient;

/**
 * Implement this interface on your activity hosting {@link FlipperDiagnosticFragment} to enable the
 * "Report Bug" button and receive a callback for it.
 */
public interface FlipperDiagnosticReportListener {

  /**
   * Called when a bug report is requested, including the flipper diagnostic information.
   *
   * @param state See {@link FlipperClient#getState()}
   * @param summary See {@link FlipperClient#getStateSummary()}
   */
  void report(String state, String summary);
}
