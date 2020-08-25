/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases;

import android.text.TextUtils;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperArray.Builder;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.databases.DatabaseDriver.DatabaseExecuteSqlResponse;
import com.facebook.flipper.plugins.databases.DatabaseDriver.DatabaseGetTableDataResponse;
import com.facebook.flipper.plugins.databases.DatabaseDriver.DatabaseGetTableInfoResponse;
import com.facebook.flipper.plugins.databases.DatabaseDriver.DatabaseGetTableStructureResponse;
import com.facebook.flipper.plugins.databases.DatabasesManager.DatabaseDescriptorHolder;
import com.facebook.flipper.plugins.databases.DatabasesManager.ExecuteSqlRequest;
import com.facebook.flipper.plugins.databases.DatabasesManager.GetTableDataRequest;
import com.facebook.flipper.plugins.databases.DatabasesManager.GetTableInfoRequest;
import com.facebook.flipper.plugins.databases.DatabasesManager.GetTableStructureRequest;
import java.io.UnsupportedEncodingException;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

public class ObjectMapper {

  private static final int MAX_BLOB_LENGTH = 100 * 1024;
  private static final String UNKNOWN_BLOB_LABEL_FORMAT = "{%d-byte %s blob}";

  public static FlipperArray databaseListToFlipperArray(
      Collection<DatabaseDescriptorHolder> databaseDescriptorHolderList) {
    FlipperArray.Builder builder = new FlipperArray.Builder();

    for (DatabaseDescriptorHolder databaseDescriptorHolder : databaseDescriptorHolderList) {

      List<String> tableNameList =
          databaseDescriptorHolder.databaseDriver.getTableNames(
              databaseDescriptorHolder.databaseDescriptor);
      Collections.sort(tableNameList);
      FlipperArray.Builder tableBuilder = new Builder();
      for (String tablename : tableNameList) {
        tableBuilder.put(tablename);
      }

      builder.put(
          new FlipperObject.Builder()
              .put("id", databaseDescriptorHolder.id)
              .put("name", databaseDescriptorHolder.databaseDescriptor.name())
              .put("tables", tableBuilder.build())
              .build());
    }

    return builder.build();
  }

  public static GetTableDataRequest flipperObjectToGetTableDataRequest(FlipperObject params) {
    int databaseId = params.getInt("databaseId");
    String table = params.getString("table");
    String order = params.getString("order");
    boolean reverse = params.getBoolean("reverse");
    int start = params.getInt("start");
    int count = params.getInt("count");
    if (databaseId <= 0 || TextUtils.isEmpty(table)) {
      return null;
    }
    return new GetTableDataRequest(databaseId, table, order, reverse, start, count);
  }

  public static GetTableStructureRequest flipperObjectToGetTableStructureRequest(
      FlipperObject params) {
    int databaseId = params.getInt("databaseId");
    String table = params.getString("table");
    if (databaseId <= 0 || TextUtils.isEmpty(table)) {
      return null;
    }
    return new GetTableStructureRequest(databaseId, table);
  }

  public static GetTableInfoRequest flipperObjectToGetTableInfoRequest(FlipperObject params) {
    int databaseId = params.getInt("databaseId");
    String table = params.getString("table");
    if (databaseId <= 0 || TextUtils.isEmpty(table)) {
      return null;
    }
    return new GetTableInfoRequest(databaseId, table);
  }

  public static ExecuteSqlRequest flipperObjectToExecuteSqlRequest(FlipperObject params) {
    int databaseId = params.getInt("databaseId");
    String value = params.getString("value");
    if (databaseId <= 0 || TextUtils.isEmpty(value)) {
      return null;
    }
    return new ExecuteSqlRequest(databaseId, value);
  }

  public static FlipperObject databaseGetTableDataReponseToFlipperObject(
      DatabaseGetTableDataResponse databaseGetTableDataResponse) {

    FlipperArray.Builder columnBuilder = new FlipperArray.Builder();
    for (String columnName : databaseGetTableDataResponse.columns) {
      columnBuilder.put(columnName);
    }

    FlipperArray.Builder rowBuilder = new FlipperArray.Builder();
    for (List<Object> row : databaseGetTableDataResponse.values) {
      FlipperArray.Builder valueBuilder = new FlipperArray.Builder();
      for (Object item : row) {
        valueBuilder.put(objectAndTypeToFlipperObject(item));
      }
      rowBuilder.put(valueBuilder.build());
    }

    return new FlipperObject.Builder()
        .put("columns", columnBuilder.build())
        .put("values", rowBuilder.build())
        .put("start", databaseGetTableDataResponse.start)
        .put("count", databaseGetTableDataResponse.count)
        .put("total", databaseGetTableDataResponse.total)
        .build();
  }

  public static FlipperObject databaseGetTableStructureResponseToFlipperObject(
      DatabaseGetTableStructureResponse databaseGetTableStructureResponse) {

    FlipperArray.Builder structureColumnBuilder = new FlipperArray.Builder();
    for (String columnName : databaseGetTableStructureResponse.structureColumns) {
      structureColumnBuilder.put(columnName);
    }

    FlipperArray.Builder indexesColumnBuilder = new FlipperArray.Builder();
    for (String columnName : databaseGetTableStructureResponse.indexesColumns) {
      indexesColumnBuilder.put(columnName);
    }

    FlipperArray.Builder structureValuesBuilder = new FlipperArray.Builder();
    for (List<Object> row : databaseGetTableStructureResponse.structureValues) {
      FlipperArray.Builder valueBuilder = new FlipperArray.Builder();
      for (Object item : row) {
        valueBuilder.put(objectAndTypeToFlipperObject(item));
      }
      structureValuesBuilder.put(valueBuilder.build());
    }

    FlipperArray.Builder indexesValuesBuilder = new FlipperArray.Builder();
    for (List<Object> row : databaseGetTableStructureResponse.indexesValues) {
      FlipperArray.Builder valueBuilder = new FlipperArray.Builder();
      for (Object item : row) {
        valueBuilder.put(objectAndTypeToFlipperObject(item));
      }
      indexesValuesBuilder.put(valueBuilder.build());
    }

    return new FlipperObject.Builder()
        .put("structureColumns", structureColumnBuilder.build())
        .put("structureValues", structureValuesBuilder.build())
        .put("indexesColumns", indexesColumnBuilder.build())
        .put("indexesValues", indexesValuesBuilder.build())
        .build();
  }

  public static FlipperObject databaseGetTableInfoResponseToFlipperObject(
      DatabaseGetTableInfoResponse databaseGetTableInfoResponse) {

    return new FlipperObject.Builder()
        .put("definition", databaseGetTableInfoResponse.definition)
        .build();
  }

  public static FlipperObject databaseExecuteSqlResponseToFlipperObject(
      DatabaseExecuteSqlResponse databaseExecuteSqlResponse) {

    FlipperArray.Builder columnBuilder = new FlipperArray.Builder();
    if (databaseExecuteSqlResponse.columns != null) {
      for (String columnName : databaseExecuteSqlResponse.columns) {
        columnBuilder.put(columnName);
      }
    }

    FlipperArray.Builder rowBuilder = new FlipperArray.Builder();
    if (databaseExecuteSqlResponse.values != null) {
      for (List<Object> row : databaseExecuteSqlResponse.values) {
        FlipperArray.Builder valueBuilder = new FlipperArray.Builder();
        for (Object item : row) {
          valueBuilder.put(objectAndTypeToFlipperObject(item));
        }
        rowBuilder.put(valueBuilder.build());
      }
    }

    return new FlipperObject.Builder()
        .put("type", databaseExecuteSqlResponse.type)
        .put("columns", columnBuilder.build())
        .put("values", rowBuilder.build())
        .put("insertedId", databaseExecuteSqlResponse.insertedId)
        .put("affectedCount", databaseExecuteSqlResponse.affectedCount)
        .build();
  }

  private static FlipperObject objectAndTypeToFlipperObject(Object object) {
    if (object == null) {
      return new FlipperObject.Builder().put("type", "null").build();
    } else if (object instanceof Long) {
      return new FlipperObject.Builder().put("type", "integer").put("value", object).build();
    } else if (object instanceof Double) {
      return new FlipperObject.Builder().put("type", "float").put("value", object).build();
    } else if (object instanceof String) {
      return new FlipperObject.Builder().put("type", "string").put("value", object).build();
    } else if (object instanceof byte[]) {
      return new FlipperObject.Builder()
          .put("type", "blob")
          .put("value", blobToString((byte[]) object))
          .build();
    } else if (object instanceof Boolean) {
      return new FlipperObject.Builder().put("type", "boolean").put("value", object).build();
    } else {
      throw new IllegalArgumentException("type of Object is invalid");
    }
  }

  private static String blobToString(byte[] blob) {
    if (blob.length <= MAX_BLOB_LENGTH) {
      if (fastIsAscii(blob)) {
        try {
          return new String(blob, "US-ASCII");
        } catch (UnsupportedEncodingException e) {
          // Fall through...
        }
      } else {
        // try UTF-8
        try {
          return new String(blob, "UTF-8");
        } catch (UnsupportedEncodingException e) {
          // Fall through...
        }
      }
      return String.format(Locale.US, UNKNOWN_BLOB_LABEL_FORMAT, blob.length, "binary");
    }
    return String.format(Locale.US, UNKNOWN_BLOB_LABEL_FORMAT, blob.length, "large");
  }

  private static boolean fastIsAscii(byte[] blob) {
    for (byte b : blob) {
      if ((b & ~0x7f) != 0) {
        return false;
      }
    }
    return true;
  }

  public static FlipperObject toErrorFlipperObject(int code, String message) {
    return new FlipperObject.Builder().put("code", code).put("message", message).build();
  }
}
