/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.network;

import android.text.TextUtils;
import android.util.Pair;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.plugins.common.BufferingFlipperPlugin;
import com.facebook.flipper.plugins.network.NetworkReporter.RequestInfo;
import com.facebook.flipper.plugins.network.NetworkReporter.ResponseInfo;
import java.io.IOException;
import java.net.HttpURLConnection;
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
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.Buffer;
import okio.BufferedSource;

public class FlipperOkhttpInterceptor
    implements Interceptor, BufferingFlipperPlugin.MockResponseConnectionListener {

  // By default, limit body size (request or response) reporting to 1MB to avoid OOM
  private static final long DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

  private final long mMaxBodyBytes;

  private final NetworkFlipperPlugin mPlugin;

  private static class PartialRequestInfo extends Pair<String, String> {
    PartialRequestInfo(String url, String method) {
      super(url, method);
    }
  }

  // pair of request url and method
  private Map<PartialRequestInfo, ResponseInfo> mMockResponseMap = new HashMap<>(0);
  private boolean mIsMockResponseSupported;

  public FlipperOkhttpInterceptor(NetworkFlipperPlugin plugin) {
    this(plugin, DEFAULT_MAX_BODY_BYTES, false);
  }

  /** If you want to change the number of bytes displayed for the body, use this constructor */
  public FlipperOkhttpInterceptor(NetworkFlipperPlugin plugin, long maxBodyBytes) {
    this(plugin, maxBodyBytes, false);
  }

  /**
   * To support mock response, addIntercept must be used (instead of addNetworkIntercept) to allow
   * short circuit: https://square.github.io/okhttp/interceptors/ *
   */
  public FlipperOkhttpInterceptor(NetworkFlipperPlugin plugin, boolean isMockResponseSupported) {
    this(plugin, DEFAULT_MAX_BODY_BYTES, isMockResponseSupported);
  }

  public FlipperOkhttpInterceptor(
      NetworkFlipperPlugin plugin, long maxBodyBytes, boolean isMockResponseSupported) {
    mPlugin = plugin;
    mMaxBodyBytes = maxBodyBytes;
    mIsMockResponseSupported = isMockResponseSupported;
    if (isMockResponseSupported) {
      mPlugin.setConnectionListener(this);
    }
  }

  @Override
  public Response intercept(Interceptor.Chain chain) throws IOException {
    Request request = chain.request();
    final Pair<Request, Buffer> requestWithClonedBody = cloneBodyAndInvalidateRequest(request);
    request = requestWithClonedBody.first;
    final String identifier = UUID.randomUUID().toString();
    mPlugin.reportRequest(convertRequest(request, requestWithClonedBody.second, identifier));

    // Check if there is a mock response
    final Response mockResponse = mIsMockResponseSupported ? getMockResponse(request) : null;
    final Response response = mockResponse != null ? mockResponse : chain.proceed(request);
    final Buffer responseBody = cloneBodyForResponse(response, mMaxBodyBytes);
    final ResponseInfo responseInfo =
        convertResponse(response, responseBody, identifier, mockResponse != null);
    mPlugin.reportResponse(responseInfo);
    return response;
  }

  private static byte[] bodyBufferToByteArray(final Buffer bodyBuffer, final long maxBodyBytes)
      throws IOException {
    return bodyBuffer.readByteArray(Math.min(bodyBuffer.size(), maxBodyBytes));
  }

  /// This method return original Request and body Buffer, while the original Request may be
  /// invalidated because body may not be read more than once
  private static Pair<Request, Buffer> cloneBodyAndInvalidateRequest(final Request request)
      throws IOException {
    if (request.body() != null) {
      final Request.Builder builder = request.newBuilder();
      final MediaType mediaType = request.body().contentType();
      final Buffer originalBuffer = new Buffer();
      request.body().writeTo(originalBuffer);
      final Buffer clonedBuffer = originalBuffer.clone();
      final RequestBody newOriginalBody =
          RequestBody.create(mediaType, originalBuffer.readByteString());
      return new Pair<>(builder.method(request.method(), newOriginalBody).build(), clonedBuffer);
    }
    return new Pair<>(request, null);
  }

  private RequestInfo convertRequest(
      Request request, final Buffer bodyBuffer, final String identifier) throws IOException {
    final List<NetworkReporter.Header> headers = convertHeader(request.headers());
    final RequestInfo info = new RequestInfo();
    info.requestId = identifier;
    info.timeStamp = System.currentTimeMillis();
    info.headers = headers;
    info.method = request.method();
    info.uri = request.url().toString();
    if (bodyBuffer != null) {
      info.body = bodyBufferToByteArray(bodyBuffer, mMaxBodyBytes);
      bodyBuffer.close();
    }

    return info;
  }

  private static Buffer cloneBodyForResponse(final Response response, long maxBodyBytes)
      throws IOException {
    if (response.body() != null
        && response.body().source() != null
        && response.body().source().buffer() != null) {
      final BufferedSource source = response.body().source();
      source.request(maxBodyBytes);
      return source.buffer().clone();
    }
    return null;
  }

  private ResponseInfo convertResponse(
      Response response, Buffer bodyBuffer, String identifier, boolean isMock) throws IOException {
    final List<NetworkReporter.Header> headers = convertHeader(response.headers());
    final ResponseInfo info = new ResponseInfo();
    info.requestId = identifier;
    info.timeStamp = response.receivedResponseAtMillis();
    info.statusCode = response.code();
    info.headers = headers;
    info.isMock = isMock;
    if (bodyBuffer != null) {
      info.body = bodyBufferToByteArray(bodyBuffer, mMaxBodyBytes);
      bodyBuffer.close();
    }

    return info;
  }

  private static List<NetworkReporter.Header> convertHeader(Headers headers) {
    final List<NetworkReporter.Header> list = new ArrayList<>(headers.size());

    final Set<String> keys = headers.names();
    for (final String key : keys) {
      list.add(new NetworkReporter.Header(key, headers.get(key)));
    }
    return list;
  }

  private void registerMockResponse(PartialRequestInfo partialRequest, ResponseInfo response) {
    if (!mMockResponseMap.containsKey(partialRequest)) {
      mMockResponseMap.put(partialRequest, response);
    }
  }

  @Nullable
  private Response getMockResponse(Request request) {
    final String url = request.url().toString();
    final String method = request.method();
    final PartialRequestInfo partialRequest = new PartialRequestInfo(url, method);

    if (!mMockResponseMap.containsKey(partialRequest)) {
      return null;
    }
    ResponseInfo mockResponse = mMockResponseMap.get(partialRequest);
    if (mockResponse == null) {
      return null;
    }

    final Response.Builder builder = new Response.Builder();
    builder
        .request(request)
        .protocol(Protocol.HTTP_1_1)
        .code(mockResponse.statusCode)
        .message(mockResponse.statusReason)
        .receivedResponseAtMillis(System.currentTimeMillis())
        .body(ResponseBody.create(MediaType.parse("application/text"), mockResponse.body));

    if (mockResponse.headers != null && !mockResponse.headers.isEmpty()) {
      for (final NetworkReporter.Header header : mockResponse.headers) {
        if (!TextUtils.isEmpty(header.name) && !TextUtils.isEmpty(header.value)) {
          builder.header(header.name, header.value);
        }
      }
    }
    return builder.build();
  }

  @Nullable
  private ResponseInfo convertFlipperObjectRouteToResponseInfo(FlipperObject route) {
    final String data = route.getString("data");
    final String requestUrl = route.getString("requestUrl");
    final String method = route.getString("method");
    FlipperArray headersArray = route.getArray("headers");
    if (TextUtils.isEmpty(requestUrl) || TextUtils.isEmpty(method)) {
      return null;
    }
    final int statusCode = route.getInt("status");

    final ResponseInfo mockResponse = new ResponseInfo();
    mockResponse.body = data.getBytes();
    mockResponse.statusCode = HttpURLConnection.HTTP_OK;
    mockResponse.statusCode = statusCode;
    mockResponse.statusReason = "OK";
    if (headersArray != null) {
      final List<NetworkReporter.Header> headers = new ArrayList<>();
      for (int j = 0; j < headersArray.length(); j++) {
        final FlipperObject header = headersArray.getObject(j);
        headers.add(new NetworkReporter.Header(header.getString("key"), header.getString("value")));
      }
      mockResponse.headers = headers;
    }
    return mockResponse;
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    connection.receive(
        "mockResponses",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            FlipperArray array = params.getArray("routes");
            mMockResponseMap.clear();
            for (int i = 0; i < array.length(); i++) {
              final FlipperObject route = array.getObject(i);
              final String requestUrl = route.getString("requestUrl");
              final String method = route.getString("method");
              ResponseInfo mockResponse = convertFlipperObjectRouteToResponseInfo(route);
              if (mockResponse != null) {
                registerMockResponse(new PartialRequestInfo(requestUrl, method), mockResponse);
              }
            }
            responder.success();
          }
        });
  }

  @Override
  public void onDisconnect() {
    mMockResponseMap.clear();
  }
}
