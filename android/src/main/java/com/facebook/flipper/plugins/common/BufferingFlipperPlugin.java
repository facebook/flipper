/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.common;

import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import javax.annotation.Nullable;

/**
 * Sonar plugin that keeps events in a buffer until a connection is available.
 *
 * <p>In order to send data to the {@link FlipperConnection}, use {@link #send(String, FlipperObject)}
 * instead of {@link FlipperConnection#send(String, FlipperObject)}.
 */
public abstract class BufferingFlipperPlugin implements FlipperPlugin {

  private static final int BUFFER_SIZE = 500;

  private @Nullable RingBuffer<CachedSonarEvent> mEventQueue;
  private @Nullable FlipperConnection mConnection;

  @Override
  public synchronized void onConnect(FlipperConnection connection) {
    mConnection = connection;

    sendBufferedEvents();
  }

  @Override
  public synchronized void onDisconnect() {
    mConnection = null;
  }

  public synchronized FlipperConnection getConnection() {
    return mConnection;
  }

  public synchronized boolean isConnected() {
    return mConnection != null;
  }

  public synchronized void send(String method, FlipperObject sonarObject) {
    if (mEventQueue == null) {
      mEventQueue = new RingBuffer<>(BUFFER_SIZE);
    }
    if (mConnection != null) {
      mConnection.send(method, sonarObject);
    } else {
      mEventQueue.enqueue(new CachedSonarEvent(method, sonarObject));
    }
  }

  private synchronized void sendBufferedEvents() {
    if (mEventQueue != null && mConnection != null) {
      for (CachedSonarEvent cachedSonarEvent : mEventQueue.asList()) {
        mConnection.send(cachedSonarEvent.method, cachedSonarEvent.sonarObject);
      }
      mEventQueue.clear();
    }
  }

  private static class CachedSonarEvent {
    final String method;
    final FlipperObject sonarObject;

    private CachedSonarEvent(String method, FlipperObject sonarObject) {
      this.method = method;
      this.sonarObject = sonarObject;
    }
  }
}
