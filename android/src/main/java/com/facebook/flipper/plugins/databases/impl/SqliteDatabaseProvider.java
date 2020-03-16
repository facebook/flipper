/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.databases.impl;

import java.io.File;
import java.util.List;

public interface SqliteDatabaseProvider {

  List<File> getDatabaseFiles();
}
