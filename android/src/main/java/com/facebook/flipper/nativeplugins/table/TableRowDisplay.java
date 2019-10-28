/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.table;

import java.util.List;

public interface TableRowDisplay {
  void updateRow(TableRow row, TableMetadata tableMetadata);

  void updateRows(List<? extends TableRow> rows, TableMetadata tableMetadata);
}
