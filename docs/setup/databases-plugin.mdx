---
id: databases-plugin
title: Databases Plugin Setup
sidebar_label: Databases
---

To use the databases plugin, you need to add the plugin to your Flipper client instance. The plugin is currently only available for Android.

## Android

Instantiate and add the plugin in `FlipperClient`.
```java
import com.facebook.flipper.plugins.databases.DatabasesFlipperPlugin;

client.addPlugin(new DatabasesFlipperPlugin(context));
```

By default it will list all sqlite databases returned by the context. If you are storing a sqlite database somewhere else, you can specify a `File` to it:

```java
client.addPlugin(new DatabasesFlipperPlugin(new SqliteDatabaseDriver(context, new SqliteDatabaseProvider() {
    @Override
    public List<File> getDatabaseFiles() {
        List<File> databaseFiles = new ArrayList<>();
        for (String databaseName : context.databaseList()) {
            databaseFiles.add(context.getDatabasePath(databaseName));
        }
        databaseFiles.add("...path_to_your_db...")
        return databaseFiles;
    }
})));
```

If you use a different type of database other than sqlite, you can implement a driver to be able to access it via Flipper. 

```java 
client.addPlugin(new DatabasesFlipperPlugin(new DatabaseDriver(context) {
    @Override
    public List getDatabases() {
        return null;
    }

    @Override
    public List<String> getTableNames(DatabaseDescriptor databaseDescriptor) {
        return null;
    }

    @Override
    public DatabaseGetTableDataResponse getTableData(DatabaseDescriptor databaseDescriptor, String table, String order, boolean reverse, int start, int count) {
        return null;
    }

    @Override
    public DatabaseGetTableStructureResponse getTableStructure(DatabaseDescriptor databaseDescriptor, String table) {
        return null;
    }

    @Override
    public DatabaseExecuteSqlResponse executeSQL(DatabaseDescriptor databaseDescriptor, String query) {
        return null;
    }
    }));
```
