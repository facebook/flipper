/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class Database1Helper extends SQLiteOpenHelper {

  // If you change the database schema, you must increment the database version.
  public static final int DATABASE_VERSION = 4;
  private static final String SQL_CREATE_FIRST_TABLE =
      "CREATE TABLE "
          + "db1_first_table"
          + " ("
          + "_id INTEGER PRIMARY KEY,"
          + "db1_col0_text TEXT,"
          + "db1_col1_integer INTEGER,"
          + "db1_col2_float FLOAT,"
          + "db1_col3_blob TEXT,"
          + "db1_col4_null TEXT DEFAULT NULL,"
          + "db1_col5 TEXT,"
          + "db1_col6 TEXT,"
          + "db1_col7 TEXT,"
          + "db1_col8 TEXT,"
          + "db1_col9 TEXT"
          + ")";
  private static final String SQL_CREATE_SECOND_TABLE =
      "CREATE TABLE "
          + "db1_empty_table"
          + " ("
          + "_id INTEGER PRIMARY KEY,"
          + "column1 TEXT,"
          + "column2 TEXT)";

  public Database1Helper(Context context) {
    super(context, "database1.db", null, DATABASE_VERSION);
  }

  @Override
  public void onCreate(SQLiteDatabase db) {
    db.execSQL(SQL_CREATE_FIRST_TABLE);
    db.execSQL(SQL_CREATE_SECOND_TABLE);
    insertSampleData(db);
  }

  @Override
  public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    // This database is only a cache for online data, so its upgrade policy is
    // to simply to discard the data and start over
    db.execSQL("DROP TABLE IF EXISTS first_table");
    db.execSQL("DROP TABLE IF EXISTS second_table");
    db.execSQL("DROP TABLE IF EXISTS db1_first_table");
    db.execSQL("DROP TABLE IF EXISTS db1_empty_table");
    onCreate(db);
  }

  @Override
  public void onDowngrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    onUpgrade(db, oldVersion, newVersion);
  }

  public void insertSampleData(SQLiteDatabase db) {
    for (int i = 0; i < 100; i++) {
      ContentValues contentValues = new ContentValues();
      contentValues.put("db1_col0_text", "Long text data for testing resizing");
      contentValues.put("db1_col1_integer", 1000 + i);
      contentValues.put("db1_col2_float", 1000.465f + i);
      contentValues.put("db1_col3_blob", new byte[] {0, 0, 0, 1, 1, 0, 1, 1});
      contentValues.put("db1_col5", "db_1_column5_value");
      contentValues.put("db1_col6", "db_1_column6_value");
      contentValues.put("db1_col7", "db_1_column7_value");
      contentValues.put("db1_col8", "db_1_column8_value");
      contentValues.put("db1_col9", "db_1_column9_value");
      db.insert("db1_first_table", null, contentValues);
    }
  }
}
