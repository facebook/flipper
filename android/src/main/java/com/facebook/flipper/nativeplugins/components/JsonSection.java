package com.facebook.flipper.nativeplugins.components;

import com.facebook.flipper.core.FlipperObject;

public class JsonSection implements UISection {
  private final String title;
  private final FlipperObject content;

  public JsonSection(String title, FlipperObject content) {
    this.title = title;
    this.content = content;
  }

  @Override
  public FlipperObject serialize() {
    return new FlipperObject.Builder()
        .put("title", title)
        .put("type", "json")
        .put("content", content)
        .build();
  }
}
