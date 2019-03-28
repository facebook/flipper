package com.facebook.flipper.android.diagnostics;

public interface FlipperDiagnosticSummaryTextFilter {
  /** Reformat the string display of the summary if necessary. */
  CharSequence applyDiagnosticSummaryTextFilter(CharSequence summary);
}
