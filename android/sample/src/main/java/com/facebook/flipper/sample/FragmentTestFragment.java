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
  View view;
  int ticker;

  public FragmentTestFragment() {
    ticker = 0;
  }

  private void updateTicker() {
    try {
      ViewGroup viewGroup = (ViewGroup) view;
      TextView textView = (TextView) viewGroup.getChildAt(1);
      String text = String.valueOf(ticker++);

      textView.setText(text);
    } finally {
      // 100% guarantee that this always happens, even if
      // your update method throws an exception
      view.postDelayed(
          new Runnable() {
            @Override
            public void run() {
              updateTicker();
            }
          },
          1000);
    }
  }

  @Override
  public View onCreateView(
      LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
    view = inflater.inflate(R.layout.fragment_test, container, false);
    view.postDelayed(
        new Runnable() {
          @Override
          public void run() {
            updateTicker();
          }
        },
        1000);

    return view;
  }
}
