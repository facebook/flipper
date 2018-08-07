package com.facebook.sonar.android.diagnostics;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.widget.Toast;
import com.facebook.sonar.android.AndroidSonarClient;
import com.facebook.sonar.core.SonarClient;
import com.facebook.sonar.core.SonarStateUpdateListener;
import android.widget.LinearLayout;
import android.view.View;
import android.widget.TextView;
import android.widget.ScrollView;

public class SonarDiagnosticActivity extends Activity implements SonarStateUpdateListener {

  private TextView textView;
  private ScrollView scrollView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    LinearLayout root = new LinearLayout(this);

    textView = new TextView(this);
    scrollView = new ScrollView(this);
    scrollView.addView(textView);
    root.addView(scrollView);

    setContentView(root);
  }

  protected void onStart() {
    super.onStart();
    SonarClient client = AndroidSonarClient.getInstance(this);
    client.subscribeForUpdates(this);
    textView.setText(client.getState());
  }

  protected void onResume() {
    super.onResume();
    scrollView.fullScroll(View.FOCUS_DOWN);
  }

@Override
  public void onUpdate() {
    final Context context = this;
    final String state = AndroidSonarClient.getInstance(context).getState();
    runOnUiThread(new Runnable() {
      @Override
      public void run() {
        textView.setText(state);
        scrollView.fullScroll(View.FOCUS_DOWN);
      }
    });
  }

  protected void onStop() {
    super.onStop();
    SonarClient client = AndroidSonarClient.getInstance(this);
    client.unsubscribe();
  }
}
