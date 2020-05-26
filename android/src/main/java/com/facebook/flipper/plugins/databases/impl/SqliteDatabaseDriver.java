/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases.impl;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteException;
import android.text.TextUtils;
import androidx.annotation.Nullable;
import androidx.sqlite.db.SupportSQLiteDatabase;
import androidx.sqlite.db.SupportSQLiteStatement;
import com.facebook.flipper.plugins.databases.DatabaseDescriptor;
import com.facebook.flipper.plugins.databases.DatabaseDriver;
import com.facebook.flipper.plugins.databases.impl.SqliteDatabaseDriver.SqliteDatabaseDescriptor;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class SqliteDatabaseDriver extends DatabaseDriver<SqliteDatabaseDescriptor> {

  private static final String SCHEMA_TABLE = "sqlite_master";
  private static final String[] UNINTERESTING_FILENAME_SUFFIXES =
      new String[] {"-journal", "-shm", "-uid", "-wal"};

  private final SqliteDatabaseProvider sqliteDatabaseProvider;
  private final SqliteDatabaseConnectionProvider sqliteDatabaseConnectionProvider;

  public SqliteDatabaseDriver(final Context context) {
    this(
        context,
        new DefaultSqliteDatabaseProvider(context));
  }

  public SqliteDatabaseDriver(
      final Context context, final SqliteDatabaseProvider sqliteDatabaseProvider) {
    this(
        context,
        sqliteDatabaseProvider,
        new DefaultSqliteDatabaseConnectionProvider());
  }

  public SqliteDatabaseDriver(
      final Context context,
      final SqliteDatabaseProvider sqliteDatabaseProvider,
      final SqliteDatabaseConnectionProvider sqliteDatabaseConnectionProvider) {
    super(context);
    this.sqliteDatabaseProvider = sqliteDatabaseProvider;
    this.sqliteDatabaseConnectionProvider = sqliteDatabaseConnectionProvider;
  }

  @Override
  public List<SqliteDatabaseDescriptor> getDatabases() {
    ArrayList<SqliteDatabaseDescriptor> databases = new ArrayList<>();
    List<File> potentialDatabaseFiles = sqliteDatabaseProvider.getDatabaseFiles();
    Collections.sort(potentialDatabaseFiles);
    Iterable<File> tidiedList = tidyDatabaseList(potentialDatabaseFiles);
    for (File database : tidiedList) {
      databases.add(new SqliteDatabaseDescriptor(database));
    }
    return databases;
  }

  @Override
  public List<String> getTableNames(SqliteDatabaseDescriptor databaseDescriptor) {
    try {
      SupportSQLiteDatabase database =
          sqliteDatabaseConnectionProvider.openDatabase(databaseDescriptor.file);
      try {
        Cursor cursor =
            database.query(
                "SELECT name FROM " + SCHEMA_TABLE + " WHERE type IN (?, ?)",
                new String[] {"table", "view"});
        try {
          List<String> tableNames = new ArrayList<>();
          while (cursor.moveToNext()) {
            tableNames.add(cursor.getString(0));
          }
          return tableNames;
        } finally {
          cursor.close();
        }
      } finally {
        close(database);
      }
    } catch (SQLiteException ex) {
      return Collections.emptyList();
    }
  }

  @Override
  public DatabaseExecuteSqlResponse executeSQL(
      SqliteDatabaseDescriptor databaseDescriptor, String query) {
    SupportSQLiteDatabase database =
        sqliteDatabaseConnectionProvider.openDatabase(databaseDescriptor.file);
    try {
      String firstWordUpperCase = getFirstWord(query).toUpperCase();
      switch (firstWordUpperCase) {
        case "UPDATE":
        case "DELETE":
          return executeUpdateDelete(database, query);
        case "INSERT":
          return executeInsert(database, query);
        case "SELECT":
        case "PRAGMA":
        case "EXPLAIN":
          return executeSelect(database, query);
        default:
          return executeRawQuery(database, query);
      }
    } finally {
      close(database);
    }
  }

  @Override
  public DatabaseGetTableDataResponse getTableData(
      SqliteDatabaseDescriptor databaseDescriptor,
      String table,
      @Nullable String order,
      boolean reverse,
      int start,
      int count) {
    SupportSQLiteDatabase database =
        sqliteDatabaseConnectionProvider.openDatabase(databaseDescriptor.file);
    try {
      String orderBy = order != null ? order + (reverse ? " DESC" : " ASC") : null;
      String query;
      if (orderBy != null) {
        query = "SELECT * from " + table + " ORDER BY " + orderBy + " LIMIT ?, ?";
      } else {
        query = "SELECT * from " + table + " LIMIT ?, ?";
      }

      Cursor cursor = database.query(query, new Object[] {start, count});
      long total = queryNumEntries(database, table);
      try {
        String[] columnNames = cursor.getColumnNames();
        List<List<Object>> rows = cursorToList(cursor);
        return new DatabaseGetTableDataResponse(
            Arrays.asList(columnNames), rows, start, rows.size(), total);
      } finally {
        cursor.close();
      }
    } finally {
      close(database);
    }
  }

  @Override
  public DatabaseGetTableStructureResponse getTableStructure(
      SqliteDatabaseDescriptor databaseDescriptor, String table) {
    SupportSQLiteDatabase database =
        sqliteDatabaseConnectionProvider.openDatabase(databaseDescriptor.file);
    try {
      Cursor structureCursor = database.query("PRAGMA table_info(" + table + ")", null);
      Cursor foreignKeysCursor = database.query("PRAGMA foreign_key_list(" + table + ")", null);
      Cursor indexesCursor = database.query("PRAGMA index_list(" + table + ")", null);

      try {
        // Structure & foreign keys

        List<String> structureColumns =
            Arrays.asList(
                "column_name", "data_type", "nullable", "default", "primary_key", "foreign_key");
        List<List<Object>> structureValues = new ArrayList<>();
        Map<String, String> foreignKeyValues = new HashMap<>();

        while (foreignKeysCursor.moveToNext()) {
          foreignKeyValues.put(
              foreignKeysCursor.getString(foreignKeysCursor.getColumnIndex("from")),
              foreignKeysCursor.getString(foreignKeysCursor.getColumnIndex("table"))
                  + "("
                  + foreignKeysCursor.getString(foreignKeysCursor.getColumnIndex("to"))
                  + ")");
        }

        while (structureCursor.moveToNext()) {

          String columnName = structureCursor.getString(structureCursor.getColumnIndex("name"));
          String foreignKey =
              foreignKeyValues.containsKey(columnName) ? foreignKeyValues.get(columnName) : null;

          structureValues.add(
              Arrays.asList(
                  columnName,
                  structureCursor.getString(structureCursor.getColumnIndex("type")),
                  structureCursor.getInt(structureCursor.getColumnIndex("notnull"))
                      == 0, // true if Nullable, false otherwise
                  getObjectFromColumnIndex(
                      structureCursor, structureCursor.getColumnIndex("dflt_value")),
                  structureCursor.getInt(structureCursor.getColumnIndex("pk")) == 1,
                  foreignKey));
        }

        // Indexes

        List<String> indexesColumns = Arrays.asList("index_name", "unique", "indexed_column_name");
        List<List<Object>> indexesValues = new ArrayList<>();

        while (indexesCursor.moveToNext()) {
          List<String> indexedColumnNames = new ArrayList<>();
          String indexName = indexesCursor.getString(indexesCursor.getColumnIndex("name"));
          Cursor indexInfoCursor = database.query("PRAGMA index_info(" + indexName + ")", null);
          try {
            while (indexInfoCursor.moveToNext()) {
              indexedColumnNames.add(
                  indexInfoCursor.getString(indexInfoCursor.getColumnIndex("name")));
            }
            indexesValues.add(
                Arrays.<Object>asList(
                    indexName,
                    indexesCursor.getInt(indexesCursor.getColumnIndex("unique")) == 1,
                    TextUtils.join(",", indexedColumnNames)));
          } finally {
            indexInfoCursor.close();
          }
        }

        return new DatabaseGetTableStructureResponse(
            structureColumns, structureValues, indexesColumns, indexesValues);

      } finally {
        structureCursor.close();
        foreignKeysCursor.close();
        indexesCursor.close();
      }
    } finally {
      close(database);
    }
  }

  @Override
  public DatabaseGetTableInfoResponse getTableInfo(
      SqliteDatabaseDescriptor databaseDescriptor, String table) {
    SupportSQLiteDatabase database =
        sqliteDatabaseConnectionProvider.openDatabase(databaseDescriptor.file);
    try {

      Cursor definitionCursor =
          database.query(
              "SELECT sql FROM " + SCHEMA_TABLE + " WHERE name=?", new String[] {table});
      try {

        // Definition
        definitionCursor.moveToFirst();
        String definition = definitionCursor.getString(definitionCursor.getColumnIndex("sql"));

        return new DatabaseGetTableInfoResponse(definition);
      } finally {
        definitionCursor.close();
      }
    } finally {
      close(database);
    }
  }

  private static List<File> tidyDatabaseList(List<File> databaseFiles) {
    Set<File> originalAsSet = new HashSet<>(databaseFiles);
    List<File> tidiedList = new ArrayList<>();
    for (File databaseFile : databaseFiles) {
      String databaseFilename = databaseFile.getPath();
      String sansSuffix = removeSuffix(databaseFilename, UNINTERESTING_FILENAME_SUFFIXES);
      if (sansSuffix.equals(databaseFilename) || !originalAsSet.contains(new File(sansSuffix))) {
        tidiedList.add(databaseFile);
      }
    }
    return tidiedList;
  }

  private static String removeSuffix(String str, String[] suffixesToRemove) {
    for (String suffix : suffixesToRemove) {
      if (str.endsWith(suffix)) {
        return str.substring(0, str.length() - suffix.length());
      }
    }
    return str;
  }

  private static String getFirstWord(String s) {
    s = s.trim();
    int firstSpace = s.indexOf(' ');
    return firstSpace >= 0 ? s.substring(0, firstSpace) : s;
  }

  private static DatabaseExecuteSqlResponse executeUpdateDelete(
      SupportSQLiteDatabase database, String query) {
    SupportSQLiteStatement statement = database.compileStatement(query);
    int count = statement.executeUpdateDelete();
    return DatabaseExecuteSqlResponse.successfulUpdateDelete(count);
  }

  private static DatabaseExecuteSqlResponse executeInsert(SupportSQLiteDatabase database, String query) {
    SupportSQLiteStatement statement = database.compileStatement(query);
    long insertedId = statement.executeInsert();
    return DatabaseExecuteSqlResponse.successfulInsert(insertedId);
  }

  private static DatabaseExecuteSqlResponse executeSelect(SupportSQLiteDatabase database, String query) {
    Cursor cursor = database.query(query, null);
    try {
      String[] columnNames = cursor.getColumnNames();
      List<List<Object>> rows = cursorToList(cursor);
      return DatabaseExecuteSqlResponse.successfulSelect(Arrays.asList(columnNames), rows);
    } finally {
      cursor.close();
    }
  }

  private static DatabaseExecuteSqlResponse executeRawQuery(SupportSQLiteDatabase database, String query) {
    database.execSQL(query);
    return DatabaseExecuteSqlResponse.successfulRawQuery();
  }

  private static List<List<Object>> cursorToList(Cursor cursor) {
    List<List<Object>> rows = new ArrayList<>();
    final int numColumns = cursor.getColumnCount();
    while (cursor.moveToNext()) {
      List<Object> values = new ArrayList<>();
      for (int column = 0; column < numColumns; column++) {
        values.add(getObjectFromColumnIndex(cursor, column));
      }
      rows.add(values);
    }
    return rows;
  }

  private static Object getObjectFromColumnIndex(Cursor cursor, int column) {
    switch (cursor.getType(column)) {
      case Cursor.FIELD_TYPE_NULL:
        return null;
      case Cursor.FIELD_TYPE_INTEGER:
        return cursor.getLong(column);
      case Cursor.FIELD_TYPE_FLOAT:
        return cursor.getDouble(column);
      case Cursor.FIELD_TYPE_BLOB:
        return cursor.getBlob(column);
      case Cursor.FIELD_TYPE_STRING:
      default:
        return cursor.getString(column);
    }
  }

  private long queryNumEntries(SupportSQLiteDatabase database, String table) {
    Cursor cursor = database.query("SELECT COUNT(*) FROM " + table);
    try {
      cursor.moveToFirst();
      return cursor.getLong(0);
    } finally {
      cursor.close();
    }
  }

  private void close(SupportSQLiteDatabase database) {
    try {
      database.close();
    } catch (IOException e) {
      // ignore
    }
  }

  static class SqliteDatabaseDescriptor implements DatabaseDescriptor {

    public final File file;

    public SqliteDatabaseDescriptor(File file) {
      this.file = file;
    }

    @Override
    public String name() {
      return file.getName();
    }
  }
}
