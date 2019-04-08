package com.facebook.flipper.nativeplugins.table;

import androidx.annotation.Nullable;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;

public class TableMetadata {

  final Column[] mColumns;
  final QueryableTableRowProvider mResponder;

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
        .build();
  }

  private TableMetadata(
      @Nullable Column[] columns, @Nullable QueryableTableRowProvider queryResponder) {
    this.mColumns = columns == null ? new Column[] {} : columns;
    this.mResponder = queryResponder;
  }

  public static class Builder {
    private Column[] columns;
    private QueryableTableRowProvider queryResponder;

    public Builder columns(Column... columns) {
      this.columns = columns;
      return this;
    }

    public Builder queryResponder(QueryableTableRowProvider responder) {
      this.queryResponder = responder;
      return this;
    }

    public TableMetadata build() {
      return new TableMetadata(columns, queryResponder);
    }
  }
}
