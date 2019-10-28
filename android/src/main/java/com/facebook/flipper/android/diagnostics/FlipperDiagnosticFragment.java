/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android.diagnostics;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.core.FlipperStateUpdateListener;
import com.facebook.flipper.core.StateSummary;
import com.facebook.flipper.core.StateSummary.StateElement;

public class FlipperDiagnosticFragment extends Fragment implements FlipperStateUpdateListener {

  TextView mSummaryView;
  TextView mLogView;
  ScrollView mScrollView;
  Button mReportButton;

  @Nullable FlipperDiagnosticReportListener mReportCallback;
  @Nullable FlipperDiagnosticSummaryTextFilter mDiagnosticSummaryTextFilter;

  private final View.OnClickListener mOnBugReportClickListener =
      new View.OnClickListener() {
        @Override
        public void onClick(View v) {
          mReportCallback.report(
              AndroidFlipperClient.getInstance(getContext()).getState(), getSummary().toString());
        }
      };

  public static FlipperDiagnosticFragment newInstance() {
    return new FlipperDiagnosticFragment();
  }

  @SuppressLint("SetTextI18n")
  @Nullable
  @Override
  public View onCreateView(
      @NonNull LayoutInflater inflater,
      @Nullable ViewGroup container,
      @Nullable Bundle savedInstanceState) {

    final LinearLayout root = new LinearLayout(getContext());
    root.setOrientation(LinearLayout.VERTICAL);

    if (mReportCallback != null) {
      mReportButton = new Button(getContext());
      mReportButton.setText("Report Bug");
      mReportButton.setOnClickListener(mOnBugReportClickListener);
    }
    mSummaryView = new TextView(getContext());
    mLogView = new TextView(getContext());
    mScrollView = new ScrollView(getContext());
    mScrollView.addView(mLogView);
    if (mReportButton != null) {
      root.addView(mReportButton);
    }
    root.addView(mSummaryView);
    root.addView(mScrollView);
    return root;
  }

  @Override
  public void onStart() {
    super.onStart();
    final FlipperClient client = AndroidFlipperClient.getInstance(getContext());
    client.subscribeForUpdates(this);

    mSummaryView.setText(getSummary());
    mLogView.setText(client.getState());
  }

  @Override
  public void onResume() {
    super.onResume();
    mScrollView.fullScroll(View.FOCUS_DOWN);
  }

  @Override
  public void onUpdate() {
    final String state = AndroidFlipperClient.getInstance(getContext()).getState();
    final CharSequence summary =
        mDiagnosticSummaryTextFilter == null
            ? getSummary()
            : mDiagnosticSummaryTextFilter.applyDiagnosticSummaryTextFilter(getSummary());

    final Activity activity = getActivity();
    if (activity != null) {
      activity.runOnUiThread(
          new Runnable() {
            @Override
            public void run() {
              mSummaryView.setText(summary);
              mLogView.setText(state);
              mScrollView.fullScroll(View.FOCUS_DOWN);
            }
          });
    }
  }

  CharSequence getSummary() {
    final Context context = getContext();
    final StateSummary summary = AndroidFlipperClient.getInstance(context).getStateSummary();
    final StringBuilder stateText = new StringBuilder(16);
    for (StateElement e : summary.mList) {
      final String status;
      switch (e.getState()) {
        case IN_PROGRESS:
          status = "⏳";
          break;
        case SUCCESS:
          status = "✅";
          break;
        case FAILED:
          status = "❌";
          break;
        case UNKNOWN:
        default:
          status = "❓";
      }
      stateText.append(status).append(e.getName()).append('\n');
    }
    return stateText.toString();
  }

  @Override
  public void onStop() {
    super.onStop();
    final FlipperClient client = AndroidFlipperClient.getInstance(getContext());
    client.unsubscribe();
  }

  @Override
  public void onAttach(Context context) {
    super.onAttach(context);

    if (context instanceof FlipperDiagnosticReportListener) {
      mReportCallback = (FlipperDiagnosticReportListener) context;
    }
    if (context instanceof FlipperDiagnosticSummaryTextFilter) {
      mDiagnosticSummaryTextFilter = (FlipperDiagnosticSummaryTextFilter) context;
    }
  }
}
