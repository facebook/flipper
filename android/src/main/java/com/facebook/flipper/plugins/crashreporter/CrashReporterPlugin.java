/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.crashreporter;

import android.app.Activity;
import android.support.annotation.Nullable;
import android.util.Log;
import java.io.StringWriter;
import java.io.PrintWriter;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;

import java.util.Random;

public class CrashReporterPlugin implements FlipperPlugin {
    public static final String ID = "CrashReporter";

    @Nullable
    private Activity mActivity;

    @Nullable private FlipperConnection mConnection;


    @Override
    public String getId() {
        return ID;
    }

    /*
     * Activity to be used to display incoming messages
     */
    public void setActivity(Activity activity) {
        mActivity = activity;
    }
//                    .put("name", paramThrowable.getCause().getLocalizedMessage())
    @Override
    public void onConnect(FlipperConnection connection) {
        mConnection = connection;
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread paramThread, Throwable paramThrowable) {
                //Catch your exception
                // Without System.exit() this will not work.
                if (mConnection != null) {
                    StringWriter sw = new StringWriter();
                    PrintWriter pw = new PrintWriter(sw);
                    paramThrowable.printStackTrace(pw);
                    mConnection.send(
                            "crash-report", new FlipperObject.Builder()
                                    .put("id", new Random().nextInt(10000))
                                    .put("callstack", sw.toString())
                                    .put("cause", paramThrowable.toString())
                                    .put("reason", paramThrowable.toString())
                                    .build()
                    );
                }
                System.exit(2);
            }
        });
    }

    @Override
    public void onDisconnect() {
        mConnection = null;
        Thread.setDefaultUncaughtExceptionHandler(null);
    }

    @Override
    public boolean runInBackground() {
        return true;
    }
}
