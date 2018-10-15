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
 * Flipper plugin that keeps events in a buffer until a connection is available.
 *
 * <p>In order to send data to the {@link FlipperConnection}, use {@link #send(String,
 * FlipperObject)} instead of {@link FlipperConnection#send(String, FlipperObject)}.
 */
public abstract class BufferingFlipperPlugin implements FlipperPlugin {

  private static final int BUFFER_SIZE = 500;

  private @Nullable RingBuffer<CachedFlipperEvent> mEventQueue;
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

  @Override
  public boolean runInBackground() {
    return true;
  }

  public synchronized FlipperConnection getConnection() {
    return mConnection;
  }

  public synchronized boolean isConnected() {
    return mConnection != null;
  }

  public synchronized void send(String method, FlipperObject flipperObject) {
    if (mEventQueue == null) {
      mEventQueue = new RingBuffer<>(BUFFER_SIZE);
    }
    if (mConnection != null) {
      mConnection.send(method, flipperObject);
    } else {
      mEventQueue.enqueue(new CachedFlipperEvent(method, flipperObject));
    }
  }

  private synchronized void sendBufferedEvents() {
    if (mEventQueue != null && mConnection != null) {
      for (CachedFlipperEvent cachedFlipperEvent : mEventQueue.asList()) {
        mConnection.send(cachedFlipperEvent.method, cachedFlipperEvent.flipperObject);
      }
      mEventQueue.clear();
    }
  }

  private static class CachedFlipperEvent {
    final String method;
    final FlipperObject flipperObject;

    private CachedFlipperEvent(String method, FlipperObject flipperObject) {
      this.method = method;
      this.flipperObject = flipperObject;
    }
  }
}
