/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases;

import android.content.Context;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.plugins.databases.impl.SqliteDatabaseDriver;
import java.util.Collections;
import java.util.List;

public class DatabasesFlipperPlugin implements FlipperPlugin {

  private static final String ID = "Databases";

  private final DatabasesManager databasesManager;

  public DatabasesFlipperPlugin(Context context) {
    this(new SqliteDatabaseDriver(context));
  }

  public DatabasesFlipperPlugin(DatabaseDriver databaseDriver) {
    this(Collections.singletonList(databaseDriver));
  }

  public DatabasesFlipperPlugin(List<DatabaseDriver> databaseDriverList) {
    databasesManager = new DatabasesManager(databaseDriverList);
  }

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    databasesManager.setConnection(connection);
  }

  @Override
  public void onDisconnect() {
    databasesManager.setConnection(null);
  }

  @Override
  public boolean runInBackground() {
    return false;
  }
}
