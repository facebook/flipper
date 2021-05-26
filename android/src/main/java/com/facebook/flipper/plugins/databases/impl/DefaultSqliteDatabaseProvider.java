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
  private static final int MAX_RECURSIVE_TRAVERSAL_DEPTH = 5;
  private static final String DB_EXTENSION = ".db";

  private final int fileDirectoryRecursiveDepth;
  private final Context context;

  public DefaultSqliteDatabaseProvider(Context context) {
    this(context, MAX_RECURSIVE_TRAVERSAL_DEPTH);
  }

  public DefaultSqliteDatabaseProvider(Context context, int fileDirectoryRecursiveDepth) {
    this.context = context;
    this.fileDirectoryRecursiveDepth = fileDirectoryRecursiveDepth;
  }

  @Override
  public List<File> getDatabaseFiles() {
    List<File> databaseFiles = new ArrayList<>();
    for (String databaseName : context.databaseList()) {
      databaseFiles.add(context.getDatabasePath(databaseName));
    }
    addDatabaseFilesRecursively(
        new File(context.getFilesDir().getPath()),
        0,
        DB_EXTENSION,
        fileDirectoryRecursiveDepth,
        databaseFiles);
    return databaseFiles;
  }

  private static void addDatabaseFilesRecursively(
      File directory, int depth, String dbExtension, int maxDepth, List<File> dbFiles) {
    if (depth >= maxDepth) {
      return;
    }
    File[] files = directory.listFiles();
    if (files != null) {
      for (File f : files) {
        if (f.isFile() && f.getPath().endsWith(dbExtension)) {
          dbFiles.add(f);
        } else if (f.isDirectory()) {
          addDatabaseFilesRecursively(f, depth + 1, dbExtension, maxDepth, dbFiles);
        }
      }
    }
  }
}
