package com.facebook.flipper.plugins.databases.impl;

import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import androidx.sqlite.db.SupportSQLiteDatabase;
import androidx.sqlite.db.framework.FrameworkSQLiteDatabaseWrapping;
import java.io.File;

public class DefaultSqliteDatabaseConnectionProvider implements SqliteDatabaseConnectionProvider {

  @Override
  public SupportSQLiteDatabase openDatabase(File databaseFile) throws SQLiteException {
    int flags = SQLiteDatabase.OPEN_READWRITE;
    SQLiteDatabase database = SQLiteDatabase.openDatabase(databaseFile.getAbsolutePath(), null, flags);
    return FrameworkSQLiteDatabaseWrapping.wrap(database);
  }
}
