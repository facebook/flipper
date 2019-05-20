/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
package com.facebook.flipper.sample;

import android.app.Application;
import android.content.ContentValues;
import android.content.Context;
import android.database.DatabaseUtils;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.sample.network.NetworkClient;
import com.facebook.soloader.SoLoader;

public class FlipperSampleApplication extends Application {
  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, false);
    Fresco.initialize(this);

    final FlipperClient client = AndroidFlipperClient.getInstance(this);

    final FlipperInitializer.IntializationResult initializationResult =
        FlipperInitializer.initFlipperPlugins(this, client);

    NetworkClient.getInstance().setOkHttpClient(initializationResult.getOkHttpClient());

    getSharedPreferences("sample", Context.MODE_PRIVATE).edit().putString("Hello", "world").apply();
    getSharedPreferences("other_sample", Context.MODE_PRIVATE)
        .edit()
        .putInt("SomeKey", 1337)
        .apply();

    Database1Helper db1Helper = new Database1Helper(this);
    Database2Helper db2Helper = new Database2Helper(this);

    DatabaseUtils.queryNumEntries(db1Helper.getReadableDatabase(), "db1_first_table", null, null);
    DatabaseUtils.queryNumEntries(db2Helper.getReadableDatabase(), "db2_first_table", null, null);
  }

  public static class Database1Helper extends SQLiteOpenHelper {

    // If you change the database schema, you must increment the database version.
    public static final int DATABASE_VERSION = 4;
    private static final String SQL_CREATE_FIRST_TABLE =
        "CREATE TABLE " + "db1_first_table" + " (" +
            "_id INTEGER PRIMARY KEY," +
            "db1_col0_text TEXT," +
            "db1_col1_integer INTEGER," +
            "db1_col2_float FLOAT," +
            "db1_col3_blob TEXT," +
            "db1_col4_null TEXT DEFAULT NULL," +
            "db1_col5 TEXT," +
            "db1_col6 TEXT," +
            "db1_col7 TEXT," +
            "db1_col8 TEXT," +
            "db1_col9 TEXT" +
        ")";
    private static final String SQL_CREATE_SECOND_TABLE =
        "CREATE TABLE " + "db1_empty_table" + " (" +
            "_id INTEGER PRIMARY KEY," +
            "column1 TEXT," +
            "column2 TEXT)";

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
        for(int i = 0 ; i < 100 ;i++) {
            ContentValues contentValues = new ContentValues();
            contentValues.put("db1_col0_text", "Long text data for testing resizing");
            contentValues.put("db1_col1_integer", 1000 + i);
            contentValues.put("db1_col2_float", 1000.465f + i);
            contentValues.put("db1_col3_blob", new byte[]{0, 0, 0, 1, 1, 0, 1, 1});
            contentValues.put("db1_col5", "db_1_column5_value");
            contentValues.put("db1_col6", "db_1_column6_value");
            contentValues.put("db1_col7", "db_1_column7_value");
            contentValues.put("db1_col8", "db_1_column8_value");
            contentValues.put("db1_col9", "db_1_column9_value");
            db.insert("db1_first_table", null, contentValues);
        }
    }
  }

  public static class Database2Helper extends SQLiteOpenHelper {

    // If you change the database schema, you must increment the database version.
    public static final int DATABASE_VERSION = 4;
    private static final String SQL_CREATE_FIRST_TABLE =
        "CREATE TABLE " + "db2_first_table" + " (" +
            "_id INTEGER PRIMARY KEY," +
            "column1 TEXT," +
            "column2 TEXT)";
    private static final String SQL_CREATE_SECOND_TABLE =
        "CREATE TABLE " + "db2_second_table" + " (" +
            "_id INTEGER PRIMARY KEY," +
            "column1 TEXT," +
            "column2 TEXT)";

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
        for(int i = 0 ; i < 10 ;i++) {
            ContentValues contentValues = new ContentValues();
            contentValues.put("column1", "Long text data for testing resizing");
            contentValues.put("column2", "extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra extra Long text data for testing resizing");
            db.insert("db2_first_table", null, contentValues);
            db.insert("db2_second_table", null, contentValues);
        }
    }
  }
}
