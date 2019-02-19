package com.facebook.common.memory.manager;

public class NoOpDebugMemoryManager implements DebugMemoryManager {

  @Override
  public void trimMemory(int trimType) {}
}
