package com.facebook.flipper.nativeplugins.table;

public class TableMetadataTestUtils {

  public static Column[] getColumns(TableMetadata tableMetadata) {
    return tableMetadata.mColumns;
  }

  public static QueryableTableRowProvider getQueryResponder(TableMetadata tableMetadata) {
    return tableMetadata.responder;
  }
}
