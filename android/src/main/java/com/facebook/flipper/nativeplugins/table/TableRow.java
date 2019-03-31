package com.facebook.flipper.nativeplugins.table;

import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.nativeplugins.components.Sidebar;
import java.util.Map;

public abstract class TableRow {
  interface Value {
    FlipperObject serialize();
  }

  public static class StringValue implements Value {
    private String val;

    public StringValue(String s) {
      this.val = s;
    }

    @Override
    public FlipperObject serialize() {
      return new FlipperObject.Builder().put("type", "string").put("value", val).build();
    }
  }

  public static class IntValue implements Value {
    private int val;

    public IntValue(int i) {
      this.val = i;
    }

    @Override
    public FlipperObject serialize() {
      return new FlipperObject.Builder().put("type", "int").put("value", val).build();
    }
  }

  public static class BooleanValue implements Value {
    private boolean val;

    public BooleanValue(boolean i) {
      this.val = i;
    }

    @Override
    public FlipperObject serialize() {
      return new FlipperObject.Builder().put("type", "boolean").put("value", val).build();
    }
  }

  public static class TimeValue implements Value {
    private long millis;

    public TimeValue(long millis) {
      this.millis = millis;
    }

    @Override
    public FlipperObject serialize() {
      return new FlipperObject.Builder().put("type", "time").put("value", millis).build();
    }
  }

  public static class DurationValue implements Value {
    private long millis;

    public DurationValue(long millis) {
      this.millis = millis;
    }

    @Override
    public FlipperObject serialize() {
      return new FlipperObject.Builder().put("type", "duration").put("value", millis).build();
    }
  }

  final String id;
  final Map<TablePlugin.Column, ? extends Value> values;
  final Sidebar sidebar;

  public TableRow(String id, Map<TablePlugin.Column, ? extends Value> values, Sidebar sidebar) {
    this.id = id;
    this.values = values;
    this.sidebar = sidebar;
  }

  final FlipperObject serialize() {
    FlipperObject.Builder columnsObject = new FlipperObject.Builder();
    for (Map.Entry<TablePlugin.Column, ? extends Value> e : values.entrySet()) {
      columnsObject.put(e.getKey().id, e.getValue().serialize());
    }
    columnsObject.put("id", id);
    return new FlipperObject.Builder()
        .put("columns", columnsObject.build())
        .put("sidebar", sidebar.serialize())
        .put("id", id)
        .build();
  }
}
