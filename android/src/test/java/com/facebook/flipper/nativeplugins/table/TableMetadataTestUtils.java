/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.table;

public class TableMetadataTestUtils {

  public static Column[] getColumns(TableMetadata tableMetadata) {
    return tableMetadata.mColumns;
  }

  public static QueryableTableRowProvider getQueryResponder(TableMetadata tableMetadata) {
    return tableMetadata.mResponder;
  }
}
