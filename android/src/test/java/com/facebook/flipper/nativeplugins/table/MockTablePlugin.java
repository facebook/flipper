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
