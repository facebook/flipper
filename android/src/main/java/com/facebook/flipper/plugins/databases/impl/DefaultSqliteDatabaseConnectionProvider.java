/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases.impl;

import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import androidx.sqlite.db.SupportSQLiteDatabase;
import java.io.File;

public class DefaultSqliteDatabaseConnectionProvider implements SqliteDatabaseConnectionProvider {

  @Override
  public SupportSQLiteDatabase openDatabase(File databaseFile) throws SQLiteException {
    int flags = SQLiteDatabase.OPEN_READWRITE;
    SQLiteDatabase database = SQLiteDatabase.openDatabase(databaseFile.getAbsolutePath(), null, flags);
    return FrameworkSQLiteDatabaseWrapping.wrap(database);
  }
}
