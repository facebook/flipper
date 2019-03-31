package com.facebook.flipper.nativeplugins.table;

public class TableMetadata {

  final TablePlugin.Column[] mColumns;

  private TableMetadata(TablePlugin.Column[] columns) {
    if (columns == null) {
      throw new IllegalArgumentException("columns must not be null");
    }
    this.mColumns = columns;
  }

  public static class Builder {
    private TablePlugin.Column[] columns;

    public Builder columns(TablePlugin.Column... columns) {
      this.columns = columns;
      return this;
    }

    public TableMetadata build() {
      return new TableMetadata(columns);
    }
  }
}
