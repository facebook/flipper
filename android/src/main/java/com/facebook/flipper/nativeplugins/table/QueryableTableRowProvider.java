/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
