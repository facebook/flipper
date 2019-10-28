/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.table;

public class Column {
  public final String id;
  final String displayName;
  final String displayWidth;
  final boolean showByDefault;
  final boolean isFilterable;

  Column(
      String id,
      String displayName,
      String displayWidth,
      boolean showByDefault,
      boolean isFilterable) {
    if (id == null) {
      throw new IllegalArgumentException("id must not be null");
    }
    if (displayName == null) {
      throw new IllegalArgumentException("displayName must not be null");
    }
    this.id = id;
    this.displayName = displayName;
    this.displayWidth = displayWidth;
    this.showByDefault = showByDefault;
    this.isFilterable = isFilterable;
  }

  public static class Builder {
    private final String id;
    private String displayName;
    private String displayWidth;
    private boolean showByDefault = true;
    private boolean isFilterable = false;

    public Builder(String id) {
      this.id = id;
    }

    public Builder displayName(String displayName) {
      this.displayName = displayName;
      return this;
    }

    public Builder displayWidthPx(int displayWidth) {
      this.displayWidth = Integer.toString(displayWidth);
      return this;
    }

    public Builder displayWidthPercent(int displayWidth) {
      this.displayWidth = Integer.toString(displayWidth) + "%";
      return this;
    }

    public Builder showByDefault(boolean showByDefault) {
      this.showByDefault = showByDefault;
      return this;
    }

    public Builder isFilterable(boolean isFilterable) {
      this.isFilterable = isFilterable;
      return this;
    }

    public Column build() {
      return new Column(id, displayName, displayWidth, showByDefault, isFilterable);
    }
  }
}
