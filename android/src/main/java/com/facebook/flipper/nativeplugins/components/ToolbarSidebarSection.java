package com.facebook.flipper.nativeplugins.components;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;

public class ToolbarSidebarSection implements SidebarSection {
  FlipperArray.Builder items = new FlipperArray.Builder();

  public ToolbarSidebarSection addLink(String label, String destination) {
    items.put(
        new FlipperObject.Builder()
            .put("type", "link")
            .put("label", label)
            .put("destination", destination));
    return this;
  }

  @Override
  public FlipperObject serialize() {
    return new FlipperObject.Builder().put("type", "toolbar").put("items", items.build()).build();
  }
}
