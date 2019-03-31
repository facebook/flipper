package com.facebook.flipper.nativeplugins.components;

import com.facebook.flipper.core.FlipperArray;

public class Sidebar {

  private final FlipperArray.Builder sections = new FlipperArray.Builder();

  public Sidebar addSection(SidebarSection section) {
    sections.put(section.serialize());
    return this;
  }

  public FlipperArray serialize() {
    return sections.build();
  }
}
