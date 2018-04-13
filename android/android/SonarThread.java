/*
 *  Copyright (c) 2004-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.android;

import android.os.Process;
import javax.annotation.Nullable;

class SonarThread extends Thread {
  private @Nullable EventBase mEventBase;

  SonarThread() {
    super("SonarEventBaseThread");
  }

  @Override
  public void run() {
    Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND);
    synchronized (this) {
      try {
        mEventBase = new EventBase();
      } finally {
        notifyAll();
      }
    }

    mEventBase.loopForever();
  }

  synchronized EventBase getEventBase() {
    while (mEventBase == null) {
      try {
        wait();
      } catch (InterruptedException e) {
        // ignore
      }
    }
    return mEventBase;
  }
}
