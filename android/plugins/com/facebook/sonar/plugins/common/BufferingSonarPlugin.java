/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.common;

import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.core.SonarPlugin;
import javax.annotation.Nullable;

/**
 * Sonar plugin that keeps events in a buffer until a connection is available.
 *
 * <p>In order to send data to the {@link SonarConnection}, use {@link #send(String, SonarObject)}
 * instead of {@link SonarConnection#send(String, SonarObject)}.
 */
public abstract class BufferingSonarPlugin implements SonarPlugin {

  private static final int BUFFER_SIZE = 500;

  private @Nullable RingBuffer<CachedSonarEvent> mEventQueue;
  private @Nullable SonarConnection mConnection;

  @Override
  public synchronized void onConnect(SonarConnection connection) {
    mConnection = connection;

    sendBufferedEvents();
  }

  @Override
  public synchronized void onDisconnect() {
    mConnection = null;
  }

  public synchronized SonarConnection getConnection() {
    return mConnection;
  }

  public synchronized boolean isConnected() {
    return mConnection != null;
  }

  public synchronized void send(String method, SonarObject sonarObject) {
    if (mEventQueue == null) {
      mEventQueue = new RingBuffer<>(BUFFER_SIZE);
    }
    mEventQueue.enqueue(new CachedSonarEvent(method, sonarObject));
    if (mConnection != null) {
      mConnection.send(method, sonarObject);
    }
  }

  private synchronized void sendBufferedEvents() {
    if (mEventQueue != null && mConnection != null) {
      for (CachedSonarEvent cachedSonarEvent : mEventQueue.asList()) {
        mConnection.send(cachedSonarEvent.method, cachedSonarEvent.sonarObject);
      }
    }
  }

  private static class CachedSonarEvent {
    final String method;
    final SonarObject sonarObject;

    private CachedSonarEvent(String method, SonarObject sonarObject) {
      this.method = method;
      this.sonarObject = sonarObject;
    }
  }
}
