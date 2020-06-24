/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases.impl;

import android.content.Context;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class DefaultSqliteDatabaseProvider implements SqliteDatabaseProvider {

  private Context context;

  public DefaultSqliteDatabaseProvider(Context context) {
    this.context = context;
  }

  @Override
  public List<File> getDatabaseFiles() {
    List<File> databaseFiles = new ArrayList<>();
    for (String databaseName : context.databaseList()) {
      databaseFiles.add(context.getDatabasePath(databaseName));
    }
    return databaseFiles;
  }
}
