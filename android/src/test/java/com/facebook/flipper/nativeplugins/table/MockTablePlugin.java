/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.table;

public class MockTablePlugin extends TablePlugin {

  @Override
  public TableMetadata getMetadata() {
    return new TableMetadata.Builder().columns().build();
  }

  @Override
  public String getTitle() {
    return "Mock Table Plugin";
  }
}
