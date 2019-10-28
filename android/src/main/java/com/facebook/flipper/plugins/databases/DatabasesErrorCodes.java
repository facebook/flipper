/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases;

public class DatabasesErrorCodes {

  public static final int ERROR_INVALID_REQUEST = 1;
  public static final String ERROR_INVALID_REQUEST_MESSAGE = "The request received was invalid";
  public static final int ERROR_DATABASE_INVALID = 2;
  public static final String ERROR_DATABASE_INVALID_MESSAGE = "Could not access database";
  public static final int ERROR_SQL_EXECUTION_EXCEPTION = 3;
}
