/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.table;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import java.util.List;

public class TableRowDisplayImpl implements TableRowDisplay {

  private final FlipperConnection mConnection;

  TableRowDisplayImpl(FlipperConnection connection, final TablePlugin subscriber) {
    this.mConnection = connection;
    connection.receive(
        "getMetadata",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            final FlipperObject metadata = subscriber.getMetadata().serialize();
            responder.success(metadata);
          }
        });
  }

  @Override
  public final void updateRow(TableRow row, TableMetadata tableMetadata) {
    final FlipperArray.Builder array = new FlipperArray.Builder();
    array.put(row.serialize());
    this.mConnection.send("updateRows", array.build());
  }

  @Override
  public final void updateRows(List<? extends TableRow> rows, TableMetadata tableMetadata) {
    final FlipperArray.Builder array = new FlipperArray.Builder();
    for (TableRow r : rows) {
      array.put(r.serialize());
    }
    this.mConnection.send("updateRows", array.build());
  }
}
