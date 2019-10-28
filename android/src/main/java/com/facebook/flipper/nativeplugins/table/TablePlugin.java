/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.table;

import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.nativeplugins.NativePlugin;
import com.facebook.flipper.nativeplugins.RawNativePlugin;

public abstract class TablePlugin implements NativePlugin {

  public abstract TableMetadata getMetadata();

  public void onConnect(TableRowDisplay display) {}

  public void onDisconnect() {};

  @Override
  public final RawNativePlugin asFlipperPlugin() {
    return new RawNativePlugin("Table", getTitle()) {

      @Override
      public void onConnect(final FlipperConnection connection) throws Exception {
        final TableRowDisplay display = new TableRowDisplayImpl(connection, TablePlugin.this);
        TablePlugin.this.onConnect(display);
      }

      @Override
      public void onDisconnect() throws Exception {
        TablePlugin.this.onDisconnect();
      }

      @Override
      public boolean runInBackground() {
        return false;
      }
    };
  }
}
