package com.facebook.flipper.plugins.databases.impl;

import java.io.File;
import java.util.List;

public interface SqliteDatabaseProvider {

    List<File> getDatabaseFiles();

}
