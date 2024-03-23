/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases;

import static org.hamcrest.Matchers.hasItem;
import static org.junit.Assert.assertThat;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.databases.DatabaseDriver.DatabaseExecuteSqlResponse;
import com.facebook.flipper.plugins.databases.impl.SqliteDatabaseDriver;
import com.facebook.flipper.plugins.databases.impl.SqliteDatabaseProvider;
import com.facebook.flipper.testing.FlipperConnectionMock;
import com.facebook.flipper.testing.FlipperResponderMock;
import java.io.File;
import java.util.Arrays;
import java.util.List;
import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

@RunWith(RobolectricTestRunner.class)
@Ignore
public class DatabasesFlipperPluginTest {

  FlipperConnectionMock connectionMock;
  FlipperResponderMock responderMock;

  DatabaseHelper databaseHelper1, databaseHelper2;
  DatabasesFlipperPlugin plugin;

  @Before
  public void setUp() {
    connectionMock = new FlipperConnectionMock();
    responderMock = new FlipperResponderMock();

    databaseHelper1 = new DatabaseHelper(RuntimeEnvironment.application, "database1.db");
    databaseHelper1
        .getWritableDatabase()
        .execSQL("INSERT INTO first_table (column1, column2) VALUES('a','b')");
    databaseHelper2 = new DatabaseHelper(RuntimeEnvironment.application, "database2.db");
    databaseHelper2
        .getWritableDatabase()
        .execSQL("INSERT INTO first_table (column1, column2) VALUES('a','b')");
    plugin =
        new DatabasesFlipperPlugin(
            new SqliteDatabaseDriver(
                RuntimeEnvironment.application,
                new SqliteDatabaseProvider() {
                  @Override
                  public List<File> getDatabaseFiles() {
                    return Arrays.asList(
                        RuntimeEnvironment.application.getDatabasePath(
                            databaseHelper1.getDatabaseName()),
                        RuntimeEnvironment.application.getDatabasePath(
                            databaseHelper2.getDatabaseName()));
                  }
                }));

    plugin.onConnect(connectionMock);
  }

  @After
  public void tearDown() {
    databaseHelper1.close();
    RuntimeEnvironment.application.deleteDatabase(databaseHelper1.getDatabaseName());
    RuntimeEnvironment.application.deleteDatabase(databaseHelper2.getDatabaseName());
  }

  @Test
  public void testCommandDatabaseList() throws Exception {
    // Arrange

    // Act
    connectionMock.receivers.get("databaseList").onReceive(null, responderMock);

    // Assert
    assertThat(
        responderMock.successes,
        hasItem(
            new FlipperArray.Builder()
                .put(
                    new FlipperObject.Builder()
                        .put("id", 1)
                        .put("name", databaseHelper1.getDatabaseName())
                        .put(
                            "tables",
                            new FlipperArray.Builder()
                                .put("android_metadata")
                                .put("first_table")
                                .put("second_table")
                                .put("sqlite_sequence")))
                .put(
                    new FlipperObject.Builder()
                        .put("id", 2)
                        .put("name", databaseHelper2.getDatabaseName())
                        .put(
                            "tables",
                            new FlipperArray.Builder()
                                .put("android_metadata")
                                .put("first_table")
                                .put("second_table")
                                .put("sqlite_sequence")))
                .build()));
  }

  @Test
  public void testCommandGetTableDataInvalidParams() throws Exception {
    // Arrange

    // Act
    connectionMock
        .receivers
        .get("getTableData")
        .onReceive(
            new FlipperObject.Builder()
                .put("databaseId", -1) // Wrong id
                .put("table", "") // invalid, can't be empty
                .build(),
            responderMock);

    // Assert
    assertThat(
        responderMock.errors,
        hasItem(
            new FlipperObject.Builder()
                .put("code", DatabasesErrorCodes.ERROR_INVALID_REQUEST)
                .put("message", DatabasesErrorCodes.ERROR_INVALID_REQUEST_MESSAGE)
                .build()));
  }

  @Test
  public void testCommandGetTableDataInvalidDatabase() throws Exception {
    // Arrange

    // Act
    connectionMock
        .receivers
        .get("getTableData")
        .onReceive(
            new FlipperObject.Builder().put("databaseId", 10).put("table", "first_table").build(),
            responderMock);

    // Assert
    assertThat(
        responderMock.errors,
        hasItem(
            new FlipperObject.Builder()
                .put("code", DatabasesErrorCodes.ERROR_DATABASE_INVALID)
                .put("message", DatabasesErrorCodes.ERROR_DATABASE_INVALID_MESSAGE)
                .build()));
  }

  @Test
  public void testCommandGetTableData() throws Exception {
    // Arrange
    connectionMock.receivers.get("databaseList").onReceive(null, responderMock); // Load data
    SQLiteDatabase db = databaseHelper1.getWritableDatabase();
    db.execSQL("INSERT INTO first_table (column1, column2) VALUES('c','d')");
    db.execSQL("INSERT INTO first_table (column1, column2) VALUES('e','f')");
    db.execSQL("INSERT INTO first_table (column1, column2) VALUES('g','h')");
    db.close();

    // Act
    connectionMock
        .receivers
        .get("getTableData")
        .onReceive(
            new FlipperObject.Builder()
                .put("databaseId", 1)
                .put("table", "first_table")
                .put("order", "column2")
                .put("reverse", true)
                .put("start", 1)
                .put("count", 2)
                .build(),
            responderMock);

    // Assert
    assertThat(
        responderMock.successes,
        hasItem(
            new FlipperObject.Builder()
                .put(
                    "columns",
                    new FlipperArray.Builder().put("_id").put("column1").put("column2").build())
                .put(
                    "values",
                    new FlipperArray.Builder()
                        .put(
                            new FlipperArray.Builder()
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "integer")
                                        .put("value", 3))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "e"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "f"))
                                .build())
                        .put(
                            new FlipperArray.Builder()
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "integer")
                                        .put("value", 2))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "c"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "d"))
                                .build())
                        .build())
                .put("start", 1)
                .put("count", 2)
                .put("total", 4)
                .build()));
  }

  @Test
  public void testCommandGetTableStructure() throws Exception {
    // Arrange
    connectionMock.receivers.get("databaseList").onReceive(null, responderMock); // Load data
    SQLiteDatabase db = databaseHelper1.getWritableDatabase();
    db.execSQL("CREATE UNIQUE INDEX index_name ON first_table(column1, column2)");
    db.close();

    // Act
    connectionMock
        .receivers
        .get("getTableStructure")
        .onReceive(
            new FlipperObject.Builder().put("databaseId", 1).put("table", "first_table").build(),
            responderMock);

    // Assert
    assertThat(
        responderMock.successes,
        hasItem(
            new FlipperObject.Builder()
                .put(
                    "structureColumns",
                    new FlipperArray.Builder()
                        .put("column_name")
                        .put("data_type")
                        .put("nullable")
                        .put("default")
                        .put("primary_key")
                        .put("foreign_key")
                        .build())
                .put(
                    "structureValues",
                    new FlipperArray.Builder()
                        .put(
                            new FlipperArray.Builder()
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "_id"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "INTEGER"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "boolean")
                                        .put("value", true))
                                .put(new FlipperObject.Builder().put("type", "null"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "boolean")
                                        .put("value", true))
                                .put(new FlipperObject.Builder().put("type", "null"))
                                .build())
                        .put(
                            new FlipperArray.Builder()
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "column1"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "TEXT"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "boolean")
                                        .put("value", true))
                                .put(new FlipperObject.Builder().put("type", "null"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "boolean")
                                        .put("value", false))
                                .put(new FlipperObject.Builder().put("type", "null"))
                                .build())
                        .put(
                            new FlipperArray.Builder()
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "column2"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "TEXT"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "boolean")
                                        .put("value", true))
                                .put(new FlipperObject.Builder().put("type", "null"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "boolean")
                                        .put("value", false))
                                .put(new FlipperObject.Builder().put("type", "null"))
                                .build())
                        .build())
                .put(
                    "indexesColumns",
                    new FlipperArray.Builder()
                        .put("index_name")
                        .put("unique")
                        .put("indexed_column_name")
                        .build())
                .put(
                    "indexesValues",
                    new FlipperArray.Builder()
                        .put(
                            new FlipperArray.Builder()
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "index_name"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "boolean")
                                        .put("value", true))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "column1,column2"))
                                .build())
                        .build())
                .build()));
  }

  @Test
  public void testCommandGetTableInfo() throws Exception {
    // Arrange
    connectionMock.receivers.get("databaseList").onReceive(null, responderMock); // Load data

    // Act
    connectionMock
        .receivers
        .get("getTableInfo")
        .onReceive(
            new FlipperObject.Builder().put("databaseId", 1).put("table", "first_table").build(),
            responderMock);

    // Assert
    assertThat(
        responderMock.successes,
        hasItem(
            new FlipperObject.Builder()
                .put(
                    "definition",
                    "CREATE TABLE first_table (_id INTEGER PRIMARY KEY AUTOINCREMENT,column1"
                        + " TEXT,column2 TEXT)")
                .build()));
  }

  @Test
  public void testCommandExecuteInvalidParams() throws Exception {
    // Arrange

    // Act
    connectionMock
        .receivers
        .get("execute")
        .onReceive(
            new FlipperObject.Builder()
                .put("databaseId", 1)
                .put("value", "") // invalid, can't be empty
                .build(),
            responderMock);

    // Assert
    assertThat(
        responderMock.errors,
        hasItem(
            new FlipperObject.Builder()
                .put("code", DatabasesErrorCodes.ERROR_INVALID_REQUEST)
                .put("message", DatabasesErrorCodes.ERROR_INVALID_REQUEST_MESSAGE)
                .build()));
  }

  @Test
  public void testCommandExecuteInvalidDatabase() throws Exception {
    // Arrange

    // Act
    connectionMock
        .receivers
        .get("execute")
        .onReceive(
            new FlipperObject.Builder().put("databaseId", 10).put("value", "SELECT...").build(),
            responderMock);

    // Assert
    assertThat(
        responderMock.errors,
        hasItem(
            new FlipperObject.Builder()
                .put("code", DatabasesErrorCodes.ERROR_DATABASE_INVALID)
                .put("message", DatabasesErrorCodes.ERROR_DATABASE_INVALID_MESSAGE)
                .build()));
  }

  @Test
  public void testCommandExecute() throws Exception {
    // Arrange
    connectionMock.receivers.get("databaseList").onReceive(null, responderMock); // Load data

    // Act
    connectionMock
        .receivers
        .get("execute")
        .onReceive(
            new FlipperObject.Builder()
                .put("databaseId", 1)
                .put("value", "SELECT column1,column2 FROM first_table")
                .build(),
            responderMock);

    // Assert
    assertThat(
        responderMock.successes,
        hasItem(
            new FlipperObject.Builder()
                .put("type", DatabaseExecuteSqlResponse.TYPE_SELECT)
                .put("columns", new FlipperArray.Builder().put("column1").put("column2").build())
                .put(
                    "values",
                    new FlipperArray.Builder()
                        .put(
                            new FlipperArray.Builder()
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "a"))
                                .put(
                                    new FlipperObject.Builder()
                                        .put("type", "string")
                                        .put("value", "b"))
                                .build())
                        .build())
                .build()));
  }

  public static class DatabaseHelper extends SQLiteOpenHelper {

    // If you change the database schema, you must increment the database version.
    public static final int DATABASE_VERSION = 1;
    private static final String SQL_CREATE_FIRST_TABLE =
        "CREATE TABLE first_table ("
            + "_id INTEGER PRIMARY KEY AUTOINCREMENT,"
            + "column1 TEXT,"
            + "column2 TEXT)";
    private static final String SQL_CREATE_SECOND_TABLE =
        "CREATE TABLE second_table ("
            + "_id INTEGER PRIMARY KEY AUTOINCREMENT,"
            + "column1 TEXT,"
            + "column2 TEXT)";

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
