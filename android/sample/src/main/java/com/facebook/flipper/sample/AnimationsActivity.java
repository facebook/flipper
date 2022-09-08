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

    btnBlink = (Button) findViewById(R.id.btnBlink);
    btnRotate = (Button) findViewById(R.id.btnRotate);
    btnMove = (Button) findViewById(R.id.btnMove);
    btnBounce = (Button) findViewById(R.id.btnBounce);
    btnSequential = (Button) findViewById(R.id.btnSequential);
    txtBlink = (TextView) findViewById(R.id.txt_blink);
    txtRotate = (TextView) findViewById(R.id.txt_rotate);
    txtMove = (TextView) findViewById(R.id.txt_move);
    txtBounce = (TextView) findViewById(R.id.txt_bounce);
    txtSeq = (TextView) findViewById(R.id.txt_seq);

    animBlink = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.blink);
    // blink
    btnBlink.setOnClickListener(
        new View.OnClickListener() {
          @Override
          public void onClick(View v) {
            txtBlink.setVisibility(View.VISIBLE);
            txtBlink.startAnimation(animBlink);
          }
        });

    animRotate = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.rotate);

    // Rotate
    btnRotate.setOnClickListener(
        new View.OnClickListener() {
          @Override
          public void onClick(View v) {
            txtRotate.startAnimation(animRotate);
          }
        });
    animMove = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.move);
    // Move
    btnMove.setOnClickListener(
        new View.OnClickListener() {
          @Override
          public void onClick(View v) {
            txtMove.startAnimation(animMove);
          }
        });

    animBounce = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.bounce);
    // Slide Down
    btnBounce.setOnClickListener(
        new View.OnClickListener() {
          @Override
          public void onClick(View v) {
            txtBounce.startAnimation(animBounce);
          }
        });
    animSequential = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.sequential);
    // Sequential
    btnSequential.setOnClickListener(
        new View.OnClickListener() {
          @Override
          public void onClick(View v) {

            txtSeq.startAnimation(animSequential);
          }
        });
  }
}
