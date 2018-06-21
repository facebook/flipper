// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.sonar.sample;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import java.util.List;
import android.widget.LinearLayout.LayoutParams;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.facebook.litho.ComponentContext;
import com.facebook.litho.LithoView;
import android.util.Log;

public class MainActivity extends AppCompatActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
   final ComponentContext c = new ComponentContext(this);
    setContentView(
        LithoView.create(
            c,
            RootComponent.create(c).build()));
  }
}
