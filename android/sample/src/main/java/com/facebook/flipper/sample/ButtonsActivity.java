/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.FragmentActivity;

public class ButtonsActivity extends FragmentActivity {

  int count = 0;
  TextView text;
  Button button;
  Button dialogOld;
  Button dialogFragment;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_buttons);

    text = findViewById(R.id.count);

    button = findViewById(com.facebook.flipper.sample.R.id.btn_inc);
    dialogOld = findViewById(R.id.dialog_old_api);
    dialogFragment = findViewById(R.id.dialog_fragment);
    button.setOnClickListener(view -> ButtonsActivity.this.text.setText(String.valueOf(++count)));

    dialogFragment.setOnClickListener(
        btn -> {
          TestDialogFragment startGameDialogFragment = new TestDialogFragment();
          startGameDialogFragment.show(getSupportFragmentManager(), "dialog");
        });

    dialogOld.setOnClickListener(
        btn -> {
          new AlertDialog.Builder(this)
              .setTitle("Old Dialog")
              .setMessage("This is an old dialog")
              .setNegativeButton(android.R.string.no, null)
              .setIcon(android.R.drawable.ic_dialog_alert)
              .show();
        });
  }
}
