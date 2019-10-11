/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android.diagnostics;

public interface FlipperDiagnosticSummaryTextFilter {
  /** Reformat the string display of the summary if necessary. */
  CharSequence applyDiagnosticSummaryTextFilter(CharSequence summary);
}
