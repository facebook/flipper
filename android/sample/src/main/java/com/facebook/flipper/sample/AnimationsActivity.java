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
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.Button;
import android.widget.TextView;

public class AnimationsActivity extends Activity {

  Button btnBlink, btnRotate, btnMove, btnBounce, btnSequential;
  Animation animBlink, animRotate, animMove, animBounce, animSequential;
  TextView txtBlink, txtRotate, txtMove, txtBounce, txtSeq;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_animations);

    btnBlink = findViewById(R.id.btnBlink);
    btnRotate = findViewById(R.id.btnRotate);
    btnMove = findViewById(R.id.btnMove);
    btnBounce = findViewById(R.id.btnBounce);
    btnSequential = findViewById(R.id.btnSequential);
    txtBlink = findViewById(R.id.txt_blink);
    txtRotate = findViewById(R.id.txt_rotate);
    txtMove = findViewById(R.id.txt_move);
    txtBounce = findViewById(R.id.txt_bounce);
    txtSeq = findViewById(R.id.txt_seq);

    animBlink = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.blink);
    btnBlink.setOnClickListener(
        v -> {
          txtBlink.setVisibility(View.VISIBLE);
          txtBlink.startAnimation(animBlink);
        });

    animRotate = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.rotate);

    btnRotate.setOnClickListener(v -> txtRotate.startAnimation(animRotate));
    animMove = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.move);

    btnMove.setOnClickListener(v -> txtMove.startAnimation(animMove));

    animBounce = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.bounce);

    btnBounce.setOnClickListener(v -> txtBounce.startAnimation(animBounce));
    animSequential = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.sequential);

    btnSequential.setOnClickListener(v -> txtSeq.startAnimation(animSequential));
  }
}
