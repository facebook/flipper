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

    DatabaseHelper db1Helper = new DatabaseHelper(this, "database1.db");
    DatabaseHelper db2Helper = new DatabaseHelper(this, "database2.db");

    long numEntries = DatabaseUtils.queryNumEntries(db1Helper.getReadableDatabase(), "first_table", null, null);
    if(numEntries == 0) {
      for(int i = 0 ; i < 10 ; i++) {
        ContentValues values = new ContentValues();
        values.put("column1", "value_" + i);
        values.put("column2", "value_2_" + i);
        db1Helper.getWritableDatabase().insert("first_table", null, values);
        db1Helper.getWritableDatabase().insert("second_table", null, values);
        db2Helper.getWritableDatabase().insert("first_table", null, values);
        db2Helper.getWritableDatabase().insert("second_table", null, values);
      }
    }
  }

  public static class DatabaseHelper extends SQLiteOpenHelper {
    // If you change the database schema, you must increment the database version.
    public static final int DATABASE_VERSION = 1;
      private static final String SQL_CREATE_FIRST_TABLE =
          "CREATE TABLE " + "first_table" + " (" +
              "_id INTEGER PRIMARY KEY," +
              "column1 TEXT," +
              "column2 TEXT)";
      private static final String SQL_CREATE_SECOND_TABLE =
          "CREATE TABLE " + "second_table" + " (" +
              "_id INTEGER PRIMARY KEY," +
              "column1 TEXT," +
              "column2 TEXT)";

    public DatabaseHelper(Context context, String databaseName) {
      super(context, databaseName, null, DATABASE_VERSION);
    }
    public void onCreate(SQLiteDatabase db) {
      db.execSQL(SQL_CREATE_FIRST_TABLE);
      db.execSQL(SQL_CREATE_SECOND_TABLE);
    }
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
      // This database is only a cache for online data, so its upgrade policy is
      // to simply to discard the data and start over
      db.execSQL("DROP TABLE IF EXISTS first_table");
      db.execSQL("DROP TABLE IF EXISTS second_table");
      onCreate(db);
    }
    public void onDowngrade(SQLiteDatabase db, int oldVersion, int newVersion) {
      onUpgrade(db, oldVersion, newVersion);
    }
  }
}
