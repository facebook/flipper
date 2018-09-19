package com.facebook.flipper.core;

public interface SonarStateUpdateListener {

  /**
   * Called when the state of the sonar client changes.
   * Typical implementations will subscribe by calling {@link com.facebook.flipper.core.SonarClient#subscribeForUpdates()}, to start receiving update events.
   * Calling {@link com.facebook.flipper.core.SonarClient#getState()} will retrieve the updated state.
   */
  void onUpdate();

}
