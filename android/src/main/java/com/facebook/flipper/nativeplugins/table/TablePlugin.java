/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.nativeplugins.table;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.nativeplugins.NativePlugin;
import java.util.List;

public abstract class TablePlugin extends NativePlugin {

  public static class Column {
    public final String id;
    final String displayName;
    final String displayWidth;
    final boolean showByDefault;
    final boolean isFilterable;

    Column(
        String id,
        String displayName,
        String displayWidth,
        boolean showByDefault,
        boolean isFilterable) {
      if (id == null) {
        throw new IllegalArgumentException("id must not be null");
      }
      if (displayName == null) {
        throw new IllegalArgumentException("displayName must not be null");
      }
      this.id = id;
      this.displayName = displayName;
      this.displayWidth = displayWidth;
      this.showByDefault = showByDefault;
      this.isFilterable = isFilterable;
    }

    public static class Builder {
      private final String id;
      private String displayName;
      private String displayWidth;
      private boolean showByDefault = true;
      private boolean isFilterable = false;

      public Builder(String id) {
        this.id = id;
      }

      public Builder displayName(String displayName) {
        this.displayName = displayName;
        return this;
      }

      public Builder displayWidthPx(int displayWidth) {
        this.displayWidth = Integer.toString(displayWidth);
        return this;
      }

      public Builder displayWidthPercent(int displayWidth) {
        this.displayWidth = Integer.toString(displayWidth) + "%";
        return this;
      }

      public Builder showByDefault(boolean showByDefault) {
        this.showByDefault = showByDefault;
        return this;
      }

      public Builder isFilterable(boolean isFilterable) {
        this.isFilterable = isFilterable;
        return this;
      }

      public Column build() {
        return new Column(id, displayName, displayWidth, showByDefault, isFilterable);
      }
    }
  }

  private FlipperConnection mConnection;

  public TablePlugin(final String id) {
    super("Table", id);
  }

  @Override
  public final void onConnect(FlipperConnection connection) {
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
            for (Column c : getMetadata().mColumns) {
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
    this.onConnected();
  }

  protected abstract void onConnected();

  protected abstract void onDisconnected();

  protected final void updateRows(List<? extends TableRow> rows) {
    final FlipperArray.Builder array = new FlipperArray.Builder();
    for (TableRow r : rows) {
      array.put(r.serialize());
    }
    this.mConnection.send("updateRows", array.build());
  }

  public abstract TableMetadata getMetadata();

  public List<? extends TableRow> getRows() {
    throw new UnsupportedOperationException(
        "getRows not implemented in "
            + getClass().getSimpleName()
            + ". Perhaps this is a streaming plugin?");
  }

  @Override
  public void onDisconnect() throws Exception {
    this.onDisconnected();
  }

  @Override
  public final boolean runInBackground() {
    return false;
  }
}
