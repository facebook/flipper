/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package androidx.sqlite.db.framework;

import android.database.sqlite.SQLiteDatabase;
import androidx.sqlite.db.SupportSQLiteDatabase;

/**
 * Gives access to package-private class {@link FrameworkSQLiteDatabase}
 */
public class FrameworkSQLiteDatabaseWrapping {

    public static SupportSQLiteDatabase wrap(SQLiteDatabase database) {
        return new FrameworkSQLiteDatabase(database);
    }
}
