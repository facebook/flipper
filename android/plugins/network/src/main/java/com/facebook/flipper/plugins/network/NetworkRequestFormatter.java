package com.facebook.flipper.plugins.network;

public interface NetworkRequestFormatter {
    interface OnCompletionListener {
        void onCompletion(String json);
    }

    boolean shouldFormat(NetworkReporter.RequestInfo request);

    void format(NetworkReporter.RequestInfo request, OnCompletionListener onCompletionListener);
}
