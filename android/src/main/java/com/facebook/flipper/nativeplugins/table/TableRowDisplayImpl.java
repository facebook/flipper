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
            final FlipperObject.Builder columns = new FlipperObject.Builder();
            final FlipperObject.Builder columnSizes = new FlipperObject.Builder();
            final FlipperArray.Builder columnOrder = new FlipperArray.Builder();
            final FlipperArray.Builder filterableColumns = new FlipperArray.Builder();
            for (Column c : subscriber.getMetadata().mColumns) {
              columns.put(c.id, new FlipperObject.Builder().put("value", c.displayName).build());
              columnSizes.put(c.id, c.displayWidth);
              columnOrder.put(
                  new FlipperObject.Builder().put("key", c.id).put("visible", c.showByDefault));
              if (c.isFilterable) {
                filterableColumns.put(c.id);
              }
            }

            responder.success(
                new FlipperObject.Builder()
                    .put("columns", columns.build())
                    .put("columnSizes", columnSizes.build())
                    .put("columnOrder", columnOrder.build())
                    .put("filterableColumns", filterableColumns.build())
                    .build());
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
