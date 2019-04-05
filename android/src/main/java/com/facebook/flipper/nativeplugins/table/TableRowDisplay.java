package com.facebook.flipper.nativeplugins.table;

import java.util.List;

public interface TableRowDisplay {
  void updateRow(TableRow row, TableMetadata tableMetadata);

  void updateRows(List<? extends TableRow> rows, TableMetadata tableMetadata);
}
