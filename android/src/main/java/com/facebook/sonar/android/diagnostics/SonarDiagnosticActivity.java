package com.facebook.sonar.android.diagnostics;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.widget.Toast;
import com.facebook.sonar.android.AndroidSonarClient;
import com.facebook.sonar.core.SonarClient;
import com.facebook.sonar.core.SonarStateUpdateListener;
import com.facebook.sonar.core.StateSummary;
import com.facebook.sonar.core.StateSummary.StateElement;
import android.widget.LinearLayout;
import android.view.View;
import android.widget.TextView;
import android.widget.ScrollView;

public class SonarDiagnosticActivity extends Activity implements SonarStateUpdateListener {

  private TextView summaryView;
  private TextView logView;
  private ScrollView scrollView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    final LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);

    summaryView = new TextView(this);
    logView = new TextView(this);
    scrollView = new ScrollView(this);
    scrollView.addView(logView);
    root.addView(summaryView);
    root.addView(scrollView);

    setContentView(root);
  }

  protected void onStart() {
    super.onStart();
    final SonarClient client = AndroidSonarClient.getInstance(this);
    client.subscribeForUpdates(this);

    summaryView.setText(getSummary());
    logView.setText(client.getState());
  }

  protected void onResume() {
    super.onResume();
    scrollView.fullScroll(View.FOCUS_DOWN);
  }

@Override
  public void onUpdate() {
    final String state = AndroidSonarClient.getInstance(this).getState();
    final String summary = getSummary();

   runOnUiThread(new Runnable() {
      @Override
      public void run() {
        summaryView.setText(summary);
        logView.setText(state);
        scrollView.fullScroll(View.FOCUS_DOWN);
      }
    });
  }

  private String getSummary() {
    final Context context = this;
    final StateSummary summary = AndroidSonarClient.getInstance(context).getStateSummary();
    final StringBuilder stateText = new StringBuilder();
    for (StateElement e: summary.mList) {
      final String status;
      switch(e.getState()) {
        case IN_PROGRESS: status = "⏳"; break;
        case SUCCESS: status = "✅"; break;
        case FAILED: status = "❌"; break;
        default: status = "❓";
      }
      stateText.append(status).append(e.getName()).append("\n");
    }
    return stateText.toString();
  }

  protected void onStop() {
    super.onStop();
    final SonarClient client = AndroidSonarClient.getInstance(this);
    client.unsubscribe();
  }
}
