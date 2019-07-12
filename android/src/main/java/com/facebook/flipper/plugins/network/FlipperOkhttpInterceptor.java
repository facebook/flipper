/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
package com.facebook.flipper.plugins.network;

import android.text.TextUtils;
import com.facebook.flipper.core.*;
import com.facebook.flipper.plugins.common.BufferingFlipperPlugin;
import com.facebook.flipper.plugins.network.NetworkReporter.RequestInfo;
import com.facebook.flipper.plugins.network.NetworkReporter.ResponseInfo;
import okhttp3.*;
import okio.Buffer;
import okio.BufferedSource;

import javax.annotation.Nullable;
import java.io.IOException;
import java.util.*;

public class FlipperOkhttpInterceptor implements Interceptor, BufferingFlipperPlugin.ConnectionListener {

  public @Nullable NetworkFlipperPlugin plugin;

  private Map<String, ResponseInfo> mockResponeMap = new HashMap<>();

  public FlipperOkhttpInterceptor() {
    this.plugin = null;
  }

  public FlipperOkhttpInterceptor(NetworkFlipperPlugin plugin) {
    this.plugin = plugin;
    this.plugin.setConnectionListener(this);

    // TODO test code, remove it later
//    ResponseInfo mockResponse = new ResponseInfo();
//    mockResponse.body = "TEST".getBytes();
//    mockResponse.statusCode = 200;
//    mockResponse.statusReason = "OK";
//    registerMockResponse("https://api.github.com/repos/facebook/yoga", "GET", mockResponse);
  }

  protected void registerMockResponse(String requestUrl, String method, ResponseInfo response) {
    mockResponeMap.put(requestUrl + "|" + method, response);
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
    ResponseInfo mockResponse = mockResponeMap.get(url+"|"+method);

    if (mockResponse != null) {
      Response.Builder builder = new Response.Builder();
      builder.request(request)
              .protocol(Protocol.HTTP_1_1)
              .code(mockResponse.statusCode)
              .message(mockResponse.statusReason)
              .receivedResponseAtMillis(System.currentTimeMillis())
              .body(ResponseBody.create(MediaType.get("application/text"), mockResponse.body));

      if (mockResponse.headers != null && mockResponse.headers.size() > 0) {
        for (NetworkReporter.Header header: mockResponse.headers) {
          if(!TextUtils.isEmpty(header.name) && !TextUtils.isEmpty(header.value)) {
            builder.header(header.name, header.value);
          }
        }
      }
      return builder.build();
    }
    return null;
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

  @Override
  public void onConnect(FlipperConnection connection) {
    connection.receive("mockResponses", new FlipperReceiver() {
      @Override
      public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
        FlipperArray array = params.getArray("routes");
        mockResponeMap.clear();

        for(int i = 0; i < array.length(); i++) {
          FlipperObject route = array.getObject(i);
          String data = route.getString("data");
          String requestUrl = route.getString("requestUrl");
          String method = route.getString("method");
          FlipperArray headersArray = route.getArray("headers");

          if (!TextUtils.isEmpty(data) && !TextUtils.isEmpty(requestUrl) && !TextUtils.isEmpty(method)) {
            ResponseInfo mockResponse = new ResponseInfo();
            mockResponse.body = data.getBytes();
            mockResponse.statusCode = 200;
            mockResponse.statusReason = "OK";

            if (headersArray != null) {
                List<NetworkReporter.Header> headers = new ArrayList<>();
                for (int j = 0; j < headersArray.length(); j++) {
                    FlipperObject header = headersArray.getObject(j);
                    headers.add(new NetworkReporter.Header(
                            header.getString("key"),
                            header.getString("value")));
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
  public void onDisconnect() {

  }
}
