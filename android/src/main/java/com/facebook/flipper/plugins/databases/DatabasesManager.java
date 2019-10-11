/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases;

import android.util.SparseArray;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.plugins.databases.DatabaseDriver.DatabaseExecuteSqlResponse;
import com.facebook.flipper.plugins.databases.DatabaseDriver.DatabaseGetTableDataResponse;
import com.facebook.flipper.plugins.databases.DatabaseDriver.DatabaseGetTableInfoResponse;
import com.facebook.flipper.plugins.databases.DatabaseDriver.DatabaseGetTableStructureResponse;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import javax.annotation.Nullable;

public class DatabasesManager {

  private static final String DATABASE_LIST_COMMAND = "databaseList";
  private static final String GET_TABLE_DATA_COMMAND = "getTableData";
  private static final String GET_TABLE_STRUCTURE_COMMAND = "getTableStructure";
  private static final String GET_TABLE_INFO_COMMAND = "getTableInfo";
  private static final String EXECUTE_COMMAND = "execute";

  private final List<DatabaseDriver> mDatabaseDriverList;
  private final SparseArray<DatabaseDescriptorHolder> mDatabaseDescriptorHolderSparseArray;
  private final Set<DatabaseDescriptorHolder> mDatabaseDescriptorHolderSet;

  private FlipperConnection mConnection;

  public DatabasesManager(List<DatabaseDriver> databaseDriverList) {
    this.mDatabaseDriverList = databaseDriverList;
    this.mDatabaseDescriptorHolderSparseArray = new SparseArray<>();
    this.mDatabaseDescriptorHolderSet =
        new TreeSet<>(
            new Comparator<DatabaseDescriptorHolder>() {
              @Override
              public int compare(DatabaseDescriptorHolder o1, DatabaseDescriptorHolder o2) {
                return o1.databaseDescriptor.name().compareTo(o2.databaseDescriptor.name());
              }
            });
  }

  public void setConnection(@Nullable FlipperConnection connection) {
    this.mConnection = connection;
    if (connection != null) {
      listenForCommands(connection);
    }
  }

  public boolean isConnected() {
    return mConnection != null;
  }

  private void listenForCommands(FlipperConnection connection) {
    connection.receive(
        DATABASE_LIST_COMMAND,
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) {
            int databaseId = 1;
            mDatabaseDescriptorHolderSparseArray.clear();
            mDatabaseDescriptorHolderSet.clear();
            for (DatabaseDriver<?> databaseDriver : mDatabaseDriverList) {
              List<? extends DatabaseDescriptor> databaseDescriptorList =
                  databaseDriver.getDatabases();
              for (DatabaseDescriptor databaseDescriptor : databaseDescriptorList) {
                int id = databaseId++;
                DatabaseDescriptorHolder databaseDescriptorHolder =
                    new DatabaseDescriptorHolder(id, databaseDriver, databaseDescriptor);
                mDatabaseDescriptorHolderSparseArray.put(id, databaseDescriptorHolder);
                mDatabaseDescriptorHolderSet.add(databaseDescriptorHolder);
              }
            }
            FlipperArray result =
                ObjectMapper.databaseListToFlipperArray(mDatabaseDescriptorHolderSet);
            responder.success(result);
          }
        });
    connection.receive(
        GET_TABLE_DATA_COMMAND,
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) {
            GetTableDataRequest getTableDataRequest =
                ObjectMapper.flipperObjectToGetTableDataRequest(params);
            if (getTableDataRequest == null) {
              responder.error(
                  ObjectMapper.toErrorFlipperObject(
                      DatabasesErrorCodes.ERROR_INVALID_REQUEST,
                      DatabasesErrorCodes.ERROR_INVALID_REQUEST_MESSAGE));
            } else {
              DatabaseDescriptorHolder databaseDescriptorHolder =
                  mDatabaseDescriptorHolderSparseArray.get(getTableDataRequest.databaseId);
              if (databaseDescriptorHolder == null) {
                responder.error(
                    ObjectMapper.toErrorFlipperObject(
                        DatabasesErrorCodes.ERROR_DATABASE_INVALID,
                        DatabasesErrorCodes.ERROR_DATABASE_INVALID_MESSAGE));
              } else {
                try {
                  DatabaseGetTableDataResponse databaseGetTableDataResponse =
                      databaseDescriptorHolder.databaseDriver.getTableData(
                          databaseDescriptorHolder.databaseDescriptor,
                          getTableDataRequest.table,
                          getTableDataRequest.order,
                          getTableDataRequest.reverse,
                          getTableDataRequest.start,
                          getTableDataRequest.count);
                  responder.success(
                      ObjectMapper.databaseGetTableDataReponseToFlipperObject(
                          databaseGetTableDataResponse));
                } catch (Exception e) {
                  responder.error(
                      ObjectMapper.toErrorFlipperObject(
                          DatabasesErrorCodes.ERROR_SQL_EXECUTION_EXCEPTION, e.getMessage()));
                }
              }
            }
          }
        });
    connection.receive(
        GET_TABLE_STRUCTURE_COMMAND,
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) {
            GetTableStructureRequest getTableStructureRequest =
                ObjectMapper.flipperObjectToGetTableStructureRequest(params);
            if (getTableStructureRequest == null) {
              responder.error(
                  ObjectMapper.toErrorFlipperObject(
                      DatabasesErrorCodes.ERROR_INVALID_REQUEST,
                      DatabasesErrorCodes.ERROR_INVALID_REQUEST_MESSAGE));
            } else {
              DatabaseDescriptorHolder databaseDescriptorHolder =
                  mDatabaseDescriptorHolderSparseArray.get(getTableStructureRequest.databaseId);
              if (databaseDescriptorHolder == null) {
                responder.error(
                    ObjectMapper.toErrorFlipperObject(
                        DatabasesErrorCodes.ERROR_DATABASE_INVALID,
                        DatabasesErrorCodes.ERROR_DATABASE_INVALID_MESSAGE));
              } else {
                try {
                  DatabaseGetTableStructureResponse databaseGetTableStructureResponse =
                      databaseDescriptorHolder.databaseDriver.getTableStructure(
                          databaseDescriptorHolder.databaseDescriptor,
                          getTableStructureRequest.table);
                  responder.success(
                      ObjectMapper.databaseGetTableStructureResponseToFlipperObject(
                          databaseGetTableStructureResponse));
                } catch (Exception e) {
                  responder.error(
                      ObjectMapper.toErrorFlipperObject(
                          DatabasesErrorCodes.ERROR_SQL_EXECUTION_EXCEPTION, e.getMessage()));
                }
              }
            }
          }
        });
    connection.receive(
        GET_TABLE_INFO_COMMAND,
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) {
            GetTableInfoRequest getTableInfoRequest =
                ObjectMapper.flipperObjectToGetTableInfoRequest(params);
            if (getTableInfoRequest == null) {
              responder.error(
                  ObjectMapper.toErrorFlipperObject(
                      DatabasesErrorCodes.ERROR_INVALID_REQUEST,
                      DatabasesErrorCodes.ERROR_INVALID_REQUEST_MESSAGE));
            } else {
              DatabaseDescriptorHolder databaseDescriptorHolder =
                  mDatabaseDescriptorHolderSparseArray.get(getTableInfoRequest.databaseId);
              if (databaseDescriptorHolder == null) {
                responder.error(
                    ObjectMapper.toErrorFlipperObject(
                        DatabasesErrorCodes.ERROR_DATABASE_INVALID,
                        DatabasesErrorCodes.ERROR_DATABASE_INVALID_MESSAGE));
              } else {
                try {
                  DatabaseGetTableInfoResponse databaseGetTableInfoResponse =
                      databaseDescriptorHolder.databaseDriver.getTableInfo(
                          databaseDescriptorHolder.databaseDescriptor, getTableInfoRequest.table);
                  responder.success(
                      ObjectMapper.databaseGetTableInfoResponseToFlipperObject(
                          databaseGetTableInfoResponse));
                } catch (Exception e) {
                  responder.error(
                      ObjectMapper.toErrorFlipperObject(
                          DatabasesErrorCodes.ERROR_SQL_EXECUTION_EXCEPTION, e.getMessage()));
                }
              }
            }
          }
        });
    connection.receive(
        EXECUTE_COMMAND,
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) {
            ExecuteSqlRequest executeSqlRequest =
                ObjectMapper.flipperObjectToExecuteSqlRequest(params);
            if (executeSqlRequest == null) {
              responder.error(
                  ObjectMapper.toErrorFlipperObject(
                      DatabasesErrorCodes.ERROR_INVALID_REQUEST,
                      DatabasesErrorCodes.ERROR_INVALID_REQUEST_MESSAGE));
            } else {
              DatabaseDescriptorHolder databaseDescriptorHolder =
                  mDatabaseDescriptorHolderSparseArray.get(executeSqlRequest.databaseId);
              if (databaseDescriptorHolder == null) {
                responder.error(
                    ObjectMapper.toErrorFlipperObject(
                        DatabasesErrorCodes.ERROR_DATABASE_INVALID,
                        DatabasesErrorCodes.ERROR_DATABASE_INVALID_MESSAGE));
              } else {
                try {
                  DatabaseExecuteSqlResponse databaseExecuteSqlResponse =
                      databaseDescriptorHolder.databaseDriver.executeSQL(
                          databaseDescriptorHolder.databaseDescriptor, executeSqlRequest.value);
                  responder.success(
                      ObjectMapper.databaseExecuteSqlResponseToFlipperObject(
                          databaseExecuteSqlResponse));
                } catch (Exception e) {
                  responder.error(
                      ObjectMapper.toErrorFlipperObject(
                          DatabasesErrorCodes.ERROR_SQL_EXECUTION_EXCEPTION, e.getMessage()));
                }
              }
            }
          }
        });
  }

  static class DatabaseDescriptorHolder {

    public final int id;
    public final DatabaseDriver databaseDriver;
    public final DatabaseDescriptor databaseDescriptor;

    public DatabaseDescriptorHolder(
        int id, DatabaseDriver databaseDriver, DatabaseDescriptor databaseDescriptor) {
      this.id = id;
      this.databaseDriver = databaseDriver;
      this.databaseDescriptor = databaseDescriptor;
    }
  }

  static class ExecuteSqlRequest {

    public final int databaseId;
    public final String value;

    ExecuteSqlRequest(int databaseId, String value) {
      this.databaseId = databaseId;
      this.value = value;
    }
  }

  static class GetTableDataRequest {

    public final int databaseId;
    public final String table;
    public final String order;
    public final boolean reverse;
    public final int start;
    public final int count;

    GetTableDataRequest(
        int databaseId, String table, String order, boolean reverse, int start, int count) {
      this.databaseId = databaseId;
      this.table = table;
      this.order = order;
      this.reverse = reverse;
      this.start = start;
      this.count = count;
    }
  }

  static class GetTableStructureRequest {

    public final int databaseId;
    public final String table;

    GetTableStructureRequest(int databaseId, String table) {
      this.databaseId = databaseId;
      this.table = table;
    }
  }

  static class GetTableInfoRequest {

    public final int databaseId;
    public final String table;

    GetTableInfoRequest(int databaseId, String table) {
      this.databaseId = databaseId;
      this.table = table;
    }
  }
}
