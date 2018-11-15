/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.android.diagnostics;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.core.FlipperStateUpdateListener;
import com.facebook.flipper.core.StateSummary;
import com.facebook.flipper.core.StateSummary.StateElement;

public class FlipperDiagnosticFragment extends Fragment implements FlipperStateUpdateListener {

  private TextView mSummaryView;
  private TextView mLogView;
  private ScrollView mScrollView;

  public static FlipperDiagnosticFragment newInstance() {
    final FlipperDiagnosticFragment fragment = new FlipperDiagnosticFragment();
    return fragment;
  }

  @Nullable
  @Override
  public View onCreateView(
      @NonNull LayoutInflater inflater,
      @Nullable ViewGroup container,
      @Nullable Bundle savedInstanceState) {

    final LinearLayout root = new LinearLayout(getContext());
    root.setOrientation(LinearLayout.VERTICAL);

    mSummaryView = new TextView(getContext());
    mLogView = new TextView(getContext());
    mScrollView = new ScrollView(getContext());
    mScrollView.addView(mLogView);
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
    final String summary = getSummary();

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

  private String getSummary() {
    final Context context = getContext();
    final StateSummary summary = AndroidFlipperClient.getInstance(context).getStateSummary();
    final StringBuilder stateText = new StringBuilder();
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
      stateText.append(status).append(e.getName()).append("\n");
    }
    return stateText.toString();
  }

  public void onStop() {
    super.onStop();
    final FlipperClient client = AndroidFlipperClient.getInstance(getContext());
    client.unsubscribe();
  }
}
