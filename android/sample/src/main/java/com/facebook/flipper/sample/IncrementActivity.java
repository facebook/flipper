/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

public class IncrementActivity extends Activity {

  int count = 0;
  TextView text;
  Button button;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_increment);

    text = (TextView) findViewById(R.id.count);

    button = (Button) findViewById(com.facebook.flipper.sample.R.id.btn_inc);
    button.setOnClickListener(
        new View.OnClickListener() {
          @Override
          public void onClick(View view) {
            IncrementActivity.this.text.setText(String.valueOf(++count));
          }
        });
  }
}
