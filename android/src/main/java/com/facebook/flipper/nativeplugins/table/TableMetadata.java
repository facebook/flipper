/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.table;

import androidx.annotation.Nullable;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.nativeplugins.components.ToolbarSection;

public class TableMetadata {

  final Column[] mColumns;
  final QueryableTableRowProvider mResponder;
  final ToolbarSection mTopToolbar;
  final ToolbarSection mBottomToolbar;

  FlipperObject serialize() {
    final FlipperObject.Builder columns = new FlipperObject.Builder();
    final FlipperObject.Builder columnSizes = new FlipperObject.Builder();
    final FlipperArray.Builder columnOrder = new FlipperArray.Builder();
    final FlipperArray.Builder filterableColumns = new FlipperArray.Builder();
    for (Column c : mColumns) {
      columns.put(c.id, new FlipperObject.Builder().put("value", c.displayName).build());
      columnSizes.put(c.id, c.displayWidth);
      columnOrder.put(new FlipperObject.Builder().put("key", c.id).put("visible", c.showByDefault));
      if (c.isFilterable) {
        filterableColumns.put(c.id);
      }
    }

    return new FlipperObject.Builder()
        .put("columns", columns.build())
        .put("columnSizes", columnSizes.build())
        .put("columnOrder", columnOrder.build())
        .put("filterableColumns", filterableColumns.build())
        .put("topToolbar", mTopToolbar != null ? mTopToolbar.serialize() : null)
        .put("bottomToolbar", mBottomToolbar != null ? mBottomToolbar.serialize() : null)
        .build();
  }

  private TableMetadata(
      @Nullable Column[] columns,
      @Nullable QueryableTableRowProvider queryResponder,
      @Nullable ToolbarSection topToolbar,
      @Nullable ToolbarSection bottomToolbar) {
    this.mColumns = columns == null ? new Column[] {} : columns;
    this.mResponder = queryResponder;
    this.mTopToolbar = topToolbar;
    this.mBottomToolbar = bottomToolbar;
  }

  public static class Builder {
    private Column[] columns;
    private QueryableTableRowProvider queryResponder;
    private ToolbarSection topToolbar;
    private ToolbarSection bottomToolbar;

    public Builder columns(Column... columns) {
      this.columns = columns;
      return this;
    }

    public Builder queryResponder(QueryableTableRowProvider responder) {
      this.queryResponder = responder;
      return this;
    }

    public Builder topToolbar(ToolbarSection bar) {
      this.topToolbar = bar;
      return this;
    }

    public Builder bottomToolbar(ToolbarSection bar) {
      this.bottomToolbar = bar;
      return this;
    }

    public TableMetadata build() {
      return new TableMetadata(columns, queryResponder, topToolbar, bottomToolbar);
    }
  }
}
