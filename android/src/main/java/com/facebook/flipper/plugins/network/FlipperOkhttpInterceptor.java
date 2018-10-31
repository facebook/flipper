/*
 *  Copyright (c) 2004-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.network;

import com.facebook.flipper.plugins.network.NetworkReporter.RequestInfo;
import com.facebook.flipper.plugins.network.NetworkReporter.ResponseInfo;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.annotation.Nullable;
import okhttp3.Headers;
import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.Buffer;
import okio.BufferedSource;

public class FlipperOkhttpInterceptor implements Interceptor {

  public @Nullable NetworkFlipperPlugin plugin;

  public FlipperOkhttpInterceptor() {
    this.plugin = null;
  }

  public FlipperOkhttpInterceptor(NetworkFlipperPlugin plugin) {
    this.plugin = plugin;
  }

  @Override
  public Response intercept(Interceptor.Chain chain) throws IOException {
    Request request = chain.request();
    String identifier = UUID.randomUUID().toString();
    plugin.reportRequest(convertRequest(request, identifier));
    Response response = chain.proceed(request);
    ResponseBody body = response.body();
    ResponseInfo responseInfo = convertResponse(response, body, identifier);
    plugin.reportResponse(responseInfo);
    return response;
  }

  private static byte[] bodyToByteArray(final Request request) throws IOException {
    final Buffer buffer = new Buffer();
    request.body().writeTo(buffer);
    return buffer.readByteArray();
  }

  private RequestInfo convertRequest(Request request, String identifier) throws IOException {
    List<NetworkReporter.Header> headers = convertHeader(request.headers());
    RequestInfo info = new RequestInfo();
    info.requestId = identifier;
    info.timeStamp = System.currentTimeMillis();
    info.headers = headers;
    info.method = request.method();
    info.uri = request.url().toString();
    if (request.body() != null) {
      info.body = bodyToByteArray(request);
    }

    return info;
  }

  private ResponseInfo convertResponse(Response response, ResponseBody body, String identifier)
      throws IOException {
    List<NetworkReporter.Header> headers = convertHeader(response.headers());
    ResponseInfo info = new ResponseInfo();
    info.requestId = identifier;
    info.timeStamp = response.receivedResponseAtMillis();
    info.statusCode = response.code();
    info.headers = headers;
    BufferedSource source = body.source();
    source.request(Long.MAX_VALUE);
    Buffer buffer = source.buffer().clone();
    info.body = buffer.readByteArray();
    return info;
  }

  private List<NetworkReporter.Header> convertHeader(Headers headers) {
    List<NetworkReporter.Header> list = new ArrayList<>();

    Set<String> keys = headers.names();
    for (String key : keys) {
      list.add(new NetworkReporter.Header(key, headers.get(key)));
    }
    return list;
  }
}
