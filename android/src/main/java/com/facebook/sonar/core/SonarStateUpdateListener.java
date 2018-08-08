package com.facebook.sonar.core;

public interface SonarStateUpdateListener {

  /**
   * Called when the state of the sonar client changes.
   * Typical implementations will subscribe by calling {@link com.facebook.sonar.core.SonarClient#subscribeForUpdates()}, to start receiving update events.
   * Calling {@link com.facebook.sonar.core.SonarClient#getState()} will retrieve the updated state.
   */
  void onUpdate();

}
