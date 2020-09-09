/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases.impl;

import android.database.sqlite.SQLiteException;
import androidx.sqlite.db.SupportSQLiteDatabase;
import java.io.File;

public interface SqliteDatabaseConnectionProvider {

  SupportSQLiteDatabase openDatabase(File databaseFile) throws SQLiteException;
}
