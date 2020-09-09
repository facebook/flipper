/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases.impl;

import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import android.os.Build;
import androidx.sqlite.db.SupportSQLiteDatabase;
import java.lang.reflect.Constructor;

/** Gives access to package-private class FrameworkSQLiteDatabase */
public class FrameworkSQLiteDatabaseWrapping {

  public static SupportSQLiteDatabase wrap(SQLiteDatabase database) throws SQLiteException {
    try {
      Class<?> clazz = Class.forName("androidx.sqlite.db.framework.FrameworkSQLiteDatabase");
      Constructor<?> constructor = clazz.getDeclaredConstructor(SQLiteDatabase.class);
      constructor.setAccessible(true);
      return (SupportSQLiteDatabase) constructor.newInstance(database);
    } catch (Exception e) {
      String errorMessage =
          "Failed to instantiate androidx.sqlite.db.framework.FrameworkSQLiteDatabase";
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
        throw new SQLiteException(errorMessage, e);
      } else {
        throw new SQLiteException(errorMessage);
      }
    }
  }
}
