/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.nativeplugins.table;

import com.facebook.flipper.nativeplugins.components.Sidebar;
import java.util.Map;

public class MockTableRow extends TableRow {
  public MockTableRow(String id, Map<Column, ? extends Value> values, Sidebar sidebar) {
    super(id, values, sidebar);
  }
}
