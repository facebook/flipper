package com.facebook.flipper.nativeplugins.table;

import com.facebook.flipper.nativeplugins.components.Sidebar;
import java.util.Map;

public class MockTableRow extends TableRow {
  public MockTableRow(String id, Map<Column, ? extends Value> values, Sidebar sidebar) {
    super(id, values, sidebar);
  }
}
