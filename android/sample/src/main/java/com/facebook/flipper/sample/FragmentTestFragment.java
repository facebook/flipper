/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.fragment.app.Fragment;

public class FragmentTestFragment extends Fragment {
  View mView;
  int mTicker;

  public FragmentTestFragment() {
    mTicker = 0;
  }

  private void updateTicker() {
    try {
      ViewGroup viewGroup = (ViewGroup) mView;
      TextView textView = (TextView) viewGroup.getChildAt(1);
      String text = String.valueOf(mTicker++);

      textView.setText(text);
    } finally {
      // 100% guarantee that this always happens, even if
      // your update method throws an exception
      mView.postDelayed(
          new Runnable() {
            @Override
            public void run() {
              updateTicker();
            }
          },
          10000);
    }
  }

  @Override
  public View onCreateView(
      LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
    mView = inflater.inflate(R.layout.fragment_test, container, false);
    mView.postDelayed(
        new Runnable() {
          @Override
          public void run() {
            updateTicker();
          }
        },
        1000);

    return mView;
  }
}
