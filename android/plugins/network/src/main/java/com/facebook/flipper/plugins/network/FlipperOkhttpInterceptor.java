/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.network;

import android.text.TextUtils;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.plugins.common.BufferingFlipperPlugin;
import com.facebook.flipper.plugins.network.NetworkReporter.RequestInfo;
import com.facebook.flipper.plugins.network.NetworkReporter.ResponseInfo;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.annotation.Nullable;
import okhttp3.Headers;
import okhttp3.Interceptor;
import okhttp3.MediaType;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.Buffer;
import okio.BufferedSource;

public class FlipperOkhttpInterceptor
    implements Interceptor, BufferingFlipperPlugin.ConnectionListener {

  // By default, limit body size (request or response) reporting to 100KB to avoid OOM
  private static final long DEFAULT_MAX_BODY_BYTES = 100 * 1024;

  private long maxBodyBytes = DEFAULT_MAX_BODY_BYTES;

  public @Nullable NetworkFlipperPlugin plugin;

  private Map<String, Map<String,ResponseInfo>> mockResponseMap = new HashMap<>();

  public FlipperOkhttpInterceptor() {
    this.plugin = null;
  }

  public FlipperOkhttpInterceptor(NetworkFlipperPlugin plugin) {
    this.plugin = plugin;
    this.plugin.setConnectionListener(this);
  }

  protected void registerMockResponse(String requestUrl, String method, ResponseInfo response) {
    Map<String, ResponseInfo> subMap = mockResponseMap.get(requestUrl);
    if (subMap == null) {
      subMap = new HashMap<>();
      mockResponseMap.put(requestUrl, subMap);
    }
    subMap.put(method, response);
  }

  /** If you want to change the number of bytes displayed for the body, use this constructor */
  public FlipperOkhttpInterceptor(NetworkFlipperPlugin plugin, long maxBodyBytes) {
    this.plugin = plugin;
    this.maxBodyBytes = maxBodyBytes;
  }

  @Override
  public Response intercept(Interceptor.Chain chain) throws IOException {
    Request request = chain.request();
    String identifier = UUID.randomUUID().toString();
    plugin.reportRequest(convertRequest(request, identifier));

    // Check if there is a mock response
    Response mockResponse = getMockResponse(request);
    Response response = mockResponse != null ? getMockResponse(request) : chain.proceed(request);

    ResponseBody body = response.body();
    ResponseInfo responseInfo = convertResponse(response, body, identifier);
    responseInfo.isMock = mockResponse != null;
    plugin.reportResponse(responseInfo);
    return response;
  }

  @Nullable
  private Response getMockResponse(Request request) {
    String url = request.url().toString();
    String method = request.method();

    if (mockResponseMap.get(url) == null ||
      mockResponseMap.get(url).get(method) == null) {
      return null;
    }

    ResponseInfo mockResponse = mockResponseMap.get(url).get(method);
    Response.Builder builder = new Response.Builder();
    builder
      .request(request)
      .protocol(Protocol.HTTP_1_1)
      .code(mockResponse.statusCode)
      .message(mockResponse.statusReason)
      .receivedResponseAtMillis(System.currentTimeMillis())
      .body(ResponseBody.create(MediaType.parse("application/text"), mockResponse.body));

    if (mockResponse.headers != null && mockResponse.headers.size() > 0) {
      for (NetworkReporter.Header header : mockResponse.headers) {
        if (!TextUtils.isEmpty(header.name) && !TextUtils.isEmpty(header.value)) {
          builder.header(header.name, header.value);
        }
      }
    }
    return builder.build();
  }

  private static byte[] bodyToByteArray(final Request request, final long maxBodyBytes)
      throws IOException {
    final Buffer buffer = new Buffer();
    request.body().writeTo(buffer);
    return buffer.readByteArray(Math.min(buffer.size(), maxBodyBytes));
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
      info.body = bodyToByteArray(request, maxBodyBytes);
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
    source.request(maxBodyBytes);
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

  @Override
  public void onConnect(FlipperConnection connection) {
    connection.receive(
        "mockResponses",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            FlipperArray array = params.getArray("routes");
            mockResponseMap.clear();

            for (int i = 0; i < array.length(); i++) {
              FlipperObject route = array.getObject(i);
              String data = route.getString("data");
              String requestUrl = route.getString("requestUrl");
              String method = route.getString("method");
              FlipperArray headersArray = route.getArray("headers");

              if (!TextUtils.isEmpty(requestUrl)
                  && !TextUtils.isEmpty(method)) {
                ResponseInfo mockResponse = new ResponseInfo();
                mockResponse.body = data.getBytes();
                mockResponse.statusCode = 200;
                mockResponse.statusReason = "OK";

                if (headersArray != null) {
                  List<NetworkReporter.Header> headers = new ArrayList<>();
                  for (int j = 0; j < headersArray.length(); j++) {
                    FlipperObject header = headersArray.getObject(j);
                    headers.add(
                        new NetworkReporter.Header(
                            header.getString("key"), header.getString("value")));
                  }
                  mockResponse.headers = headers;
                }
                registerMockResponse(requestUrl, method, mockResponse);
              }
            }
            responder.success();
          }
        });
  }

  @Override
  public void onDisconnect() {}
}
