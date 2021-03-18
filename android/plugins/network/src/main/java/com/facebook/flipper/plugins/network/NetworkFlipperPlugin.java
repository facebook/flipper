/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.network;

import android.util.Base64;
import com.facebook.flipper.core.ErrorReportingRunnable;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.common.BufferingFlipperPlugin;
import java.util.Arrays;
import java.util.List;
import javax.annotation.Nullable;

public class NetworkFlipperPlugin extends BufferingFlipperPlugin implements NetworkReporter {
  public static final String ID = "Network";
  private static final int MAX_BODY_SIZE_IN_BYTES = 1024 * 1024;

  private final List<NetworkResponseFormatter> mFormatters;

  public NetworkFlipperPlugin() {
    this(null);
  }

  public NetworkFlipperPlugin(List<NetworkResponseFormatter> formatters) {
    this.mFormatters = formatters;
  }

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public void reportRequest(final RequestInfo requestInfo) {
    (new ErrorReportingRunnable(getConnection()) {
          @Override
          protected void runOrThrow() throws Exception {
            final FlipperObject request =
                new FlipperObject.Builder()
                    .put("id", requestInfo.requestId)
                    .put("timestamp", requestInfo.timeStamp)
                    .put("method", requestInfo.method)
                    .put("url", requestInfo.uri)
                    .put("headers", toFlipperObject(requestInfo.headers))
                    .put("data", toBase64(requestInfo.body))
                    .build();

            send("newRequest", request);
          }
        })
        .run();
  }

  @Override
  public void reportResponse(final ResponseInfo responseInfo) {
    final Runnable job =
        new ErrorReportingRunnable(getConnection()) {
          @Override
          protected void runOrThrow() throws Exception {
            if (shouldStripResponseBody(responseInfo)) {
              responseInfo.body = null;
            }

            int numChunks =
                responseInfo.body == null
                    ? 1
                    : Math.max(
                        (int) Math.ceil((double) responseInfo.body.length / MAX_BODY_SIZE_IN_BYTES),
                        1);

            for (int i = 0; i < numChunks; i++) {
              byte[] chunk =
                  responseInfo.body == null
                      ? null
                      : Arrays.copyOfRange(
                          responseInfo.body,
                          i * MAX_BODY_SIZE_IN_BYTES,
                          Math.min((i + 1) * MAX_BODY_SIZE_IN_BYTES, responseInfo.body.length));
              final FlipperObject response =
                  i == 0
                      ? new FlipperObject.Builder()
                          .put("id", responseInfo.requestId)
                          .put("timestamp", responseInfo.timeStamp)
                          .put("status", responseInfo.statusCode)
                          .put("reason", responseInfo.statusReason)
                          .put("headers", toFlipperObject(responseInfo.headers))
                          .put("isMock", responseInfo.isMock)
                          .put("data", toBase64(chunk))
                          .put("totalChunks", numChunks)
                          .put("index", i)
                          .build()
                      : new FlipperObject.Builder()
                          .put("id", responseInfo.requestId)
                          .put("timestamp", responseInfo.timeStamp)
                          .put("totalChunks", numChunks)
                          .put("index", i)
                          .put("data", toBase64(chunk))
                          .build();

              send(numChunks == 1 ? "newResponse" : "partialResponse", response);
            }
          }
        };

    if (mFormatters != null) {
      for (NetworkResponseFormatter formatter : mFormatters) {
        if (formatter.shouldFormat(responseInfo)) {
          formatter.format(
              responseInfo,
              new NetworkResponseFormatter.OnCompletionListener() {
                @Override
                public void onCompletion(final String json) {
                  responseInfo.body = json.getBytes();
                  job.run();
                }
              });
          return;
        }
      }
    }

    job.run();
  }

  public void addProtobufDefinitions(final FlipperObject definitions) {
    (new ErrorReportingRunnable(getConnection()) {
      @Override
      protected void runOrThrow() throws Exception {
        send("addProtobufDefinitions", definitions);
      }
    })
    .run();
  }

  private String toBase64(@Nullable byte[] bytes) {
    if (bytes == null) {
      return null;
    }
    return new String(Base64.encode(bytes, Base64.DEFAULT));
  }

  private FlipperArray toFlipperObject(List<Header> headers) {
    final FlipperArray.Builder list = new FlipperArray.Builder();

    for (Header header : headers) {
      list.put(new FlipperObject.Builder().put("key", header.name).put("value", header.value));
    }

    return list.build();
  }

  private static boolean shouldStripResponseBody(ResponseInfo responseInfo) {
    final Header contentType = responseInfo.getFirstHeader("content-type");
    if (contentType == null) {
      return false;
    }

    return contentType.value.contains("video/") || contentType.value.contains("application/zip");
  }
}
