/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import android.os.Process;
import javax.annotation.Nullable;

class FlipperThread extends Thread {
  private @Nullable EventBase mEventBase;

  FlipperThread(final String name) {
    super(name);
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
