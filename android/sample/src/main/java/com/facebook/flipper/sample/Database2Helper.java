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

public class Database2Helper extends SQLiteOpenHelper {

  // If you change the database schema, you must increment the database version.
  public static final int DATABASE_VERSION = 4;
  private static final String SQL_CREATE_FIRST_TABLE =
      "CREATE TABLE "
          + "db2_first_table"
          + " ("
          + "_id INTEGER PRIMARY KEY,"
          + "column1 TEXT,"
          + "column2 TEXT)";
  private static final String SQL_CREATE_SECOND_TABLE =
      "CREATE TABLE "
          + "db2_second_table"
          + " ("
          + "_id INTEGER PRIMARY KEY,"
          + "column1 TEXT,"
          + "column2 TEXT)";

  public Database2Helper(Context context) {
    super(context, "database2.db", null, DATABASE_VERSION);
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
    db.execSQL("DROP TABLE IF EXISTS db2_first_table");
    db.execSQL("DROP TABLE IF EXISTS db2_second_table");
    onCreate(db);
  }

  @Override
  public void onDowngrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    onUpgrade(db, oldVersion, newVersion);
  }

  public void insertSampleData(SQLiteDatabase db) {
    for (int i = 0; i < 10; i++) {
      ContentValues contentValues = new ContentValues();
      contentValues.put("column1", "Long text data for testing resizing");
      contentValues.put(
          "column2",
          "extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra Long text data for testing resizing");
      db.insert("db2_first_table", null, contentValues);
      db.insert("db2_second_table", null, contentValues);
    }
  }
}
