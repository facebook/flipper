package com.facebook.flipper.nativeplugins.table;

import java.util.List;

public interface QueryableTableRowProvider {

  TableQueryResult getQueryResults(String query);

  class TableQueryResult {
    final TableMetadata metadata;
    final List<? extends TableRow> results;

    public TableQueryResult(final TableMetadata metadata, final List<? extends TableRow> results) {
      this.metadata = metadata;
      this.results = results;
    }
  }
}
