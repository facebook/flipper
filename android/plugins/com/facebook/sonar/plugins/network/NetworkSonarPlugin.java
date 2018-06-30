/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.network;

import android.util.Base64;
import com.facebook.sonar.core.ErrorReportingRunnable;
import com.facebook.sonar.core.SonarArray;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.plugins.common.BufferingSonarPlugin;
import java.util.List;

public class NetworkSonarPlugin extends BufferingSonarPlugin implements NetworkReporter {
  public static final String ID = "Network";

  private final List<NetworkResponseFormatter> mFormatters;

  public NetworkSonarPlugin() {
    this(null);
  }

  public NetworkSonarPlugin(List<NetworkResponseFormatter> formatters) {
    this.mFormatters = formatters;
  }

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public void reportRequest(RequestInfo requestInfo) {
    final SonarObject request =
        new SonarObject.Builder()
            .put("id", requestInfo.requestId)
            .put("timestamp", requestInfo.timeStamp)
            .put("method", requestInfo.method)
            .put("url", requestInfo.uri)
            .put("headers", toSonarObject(requestInfo.headers))
            .put("data", toBase64(requestInfo.body))
            .build();

    send("newRequest", request);
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

            final SonarObject response =
                new SonarObject.Builder()
                    .put("id", responseInfo.requestId)
                    .put("timestamp", responseInfo.timeStamp)
                    .put("status", responseInfo.statusCode)
                    .put("reason", responseInfo.statusReason)
                    .put("headers", toSonarObject(responseInfo.headers))
                    .put("data", toBase64(responseInfo.body))
                    .build();

            send("newResponse", response);
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

  private String toBase64(byte[] bytes) {
    if (bytes == null) {
      return null;
    }
    return new String(Base64.encode(bytes, Base64.DEFAULT));
  }

  private SonarArray toSonarObject(List<Header> headers) {
    final SonarArray.Builder list = new SonarArray.Builder();

    for (Header header : headers) {
      list.put(new SonarObject.Builder().put("key", header.name).put("value", header.value));
    }

    return list.build();
  }

  private static boolean shouldStripResponseBody(ResponseInfo responseInfo) {
    final Header contentType = responseInfo.getFirstHeader("content-type");
    if (contentType == null) {
      return false;
    }

    return contentType.value.contains("image/")
        || contentType.value.contains("video/")
        || contentType.value.contains("application/zip");
  }
}
