package com.facebook.flipper.plugins.databases;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringDef;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.List;

public abstract class DatabaseDriver<DESCRIPTOR extends DatabaseDescriptor> {

    protected Context mContext;

    public DatabaseDriver(@NonNull final Context context) {
        mContext = context;
    }

    @NonNull
    public Context getContext() {
        return mContext;
    }

    @NonNull
    public abstract List<DESCRIPTOR> getDatabases();

    public abstract List<String> getTableNames(@NonNull DESCRIPTOR databaseDescriptor);

    public abstract DatabaseGetTableDataResponse getTableData(@NonNull DESCRIPTOR databaseDescriptor, @NonNull String table, @Nullable String order, boolean reverse, int start, int count);

    public abstract DatabaseGetTableStructureResponse getTableStructure(@NonNull DESCRIPTOR databaseDescriptor, @NonNull String table);

    public abstract DatabaseExecuteSqlResponse executeSQL(@NonNull DESCRIPTOR databaseDescriptor, @NonNull String query);

    public static class DatabaseGetTableDataResponse {

        public final List<String> columns;
        public final List<List<Object>> values;
        public final Integer start;
        public final Integer count;
        public final Long total;

        public DatabaseGetTableDataResponse(final List<String> columns, final List<List<Object>> values, int start, int count, long total) {
            this.columns = columns;
            this.values = values;
            this.start = start;
            this.count = count;
            this.total = total;
        }
    }

    public static class DatabaseGetTableStructureResponse {

        public final List<String> structureColumns;
        public final List<List<Object>> structureValues;
        public final List<String> indexesColumns;
        public final List<List<Object>> indexesValues;
        public final String definition;

        public DatabaseGetTableStructureResponse(final List<String> structureColumns, final List<List<Object>> structureValues, final List<String> indexesColumns, final List<List<Object>> indexesValues, String definition) {
            this.structureColumns = structureColumns;
            this.structureValues = structureValues;
            this.indexesColumns = indexesColumns;
            this.indexesValues = indexesValues;
            this.definition = definition;
        }
    }

    public static class DatabaseExecuteSqlResponse {

        @Retention(RetentionPolicy.SOURCE)
        @StringDef({TYPE_SELECT, TYPE_INSERT, TYPE_UPDATE_DELETE, TYPE_RAW})
        public @interface Type {}
        public static final String TYPE_SELECT = "select";
        public static final String TYPE_INSERT = "insert";
        public static final String TYPE_UPDATE_DELETE = "update_delete";
        public static final String TYPE_RAW = "raw";

        public final @Type String type;

        // Select
        public final List<String> columns;
        public final List<List<Object>> values;

        // insert
        public final Long insertedId;

        // update/delete
        public final Integer affectedCount;

        private DatabaseExecuteSqlResponse(final @Type String type, final List<String> columns, final List<List<Object>> values, Long insertedId, Integer affectedCount) {
            this.type = type;
            this.columns = columns;
            this.values = values;
            this.insertedId = insertedId;
            this.affectedCount = affectedCount;
        }

        public static DatabaseExecuteSqlResponse successfulSelect(List<String> columns, List<List<Object>> values) {
            return new DatabaseExecuteSqlResponse(
                TYPE_SELECT,
                columns,
                values,
                null,
                null
            );
        }

        public static DatabaseExecuteSqlResponse successfulInsert(long insertedId) {
            return new DatabaseExecuteSqlResponse(
                TYPE_INSERT,
                null,
                null,
                insertedId,
                null
            );
        }

        public static DatabaseExecuteSqlResponse successfulUpdateDelete(int affectedRows) {
            return new DatabaseExecuteSqlResponse(
                TYPE_UPDATE_DELETE,
                null,
                null,
                null,
                affectedRows
            );
        }

        public static DatabaseExecuteSqlResponse successfulRawQuery() {
            return new DatabaseExecuteSqlResponse(
                TYPE_RAW,
                null,
                null,
                null,
                null
            );
        }
    }
}
