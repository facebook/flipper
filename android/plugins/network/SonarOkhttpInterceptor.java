// Copyright 2004-present Facebook. All Rights Reserved.
package com.facebook.sonar.plugins.network;

import android.util.Log;
import com.facebook.sonar.plugins.network.NetworkReporter.RequestInfo;
import com.facebook.sonar.plugins.network.NetworkReporter.ResponseInfo;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Set;
import javax.annotation.Nullable;
import okhttp3.Headers;
import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.Buffer;

public class SonarOkhttpInterceptor implements Interceptor {

  public @Nullable NetworkSonarPlugin plugin;

  public SonarOkhttpInterceptor() {
    this.plugin = null;
  }

  public SonarOkhttpInterceptor(NetworkSonarPlugin plugin) {
    this.plugin = plugin;
  }

  @Override
  public Response intercept(Interceptor.Chain chain) throws IOException {
    Request request = chain.request();
    int randInt = randInt(1, Integer.MAX_VALUE);
    plugin.reportRequest(convertRequest(request, randInt));
    Response response = chain.proceed(request);
    ResponseBody body = response.body();
    ResponseInfo responseInfo = convertResponse(response, body, randInt);
    plugin.reportResponse(responseInfo);
    // Creating new response as can't used response.body() more than once
    return response
        .newBuilder()
        .body(ResponseBody.create(body.contentType(), responseInfo.body))
        .build();
  }

  private static byte[] bodyToByteArray(final Request request) {

    try {
      final Request copy = request.newBuilder().build();
      final Buffer buffer = new Buffer();
      copy.body().writeTo(buffer);
      return buffer.readByteArray();
    } catch (final IOException e) {
      return e.getMessage().getBytes();
    }
  }

  private RequestInfo convertRequest(Request request, int identifier) {
    List<NetworkReporter.Header> headers = convertHeader(request.headers());
    RequestInfo info = new RequestInfo();
    info.requestId = String.valueOf(identifier);
    info.timeStamp = System.currentTimeMillis();
    info.headers = headers;
    info.method = request.method();
    info.uri = request.url().toString();
    if (request.body() != null) {
      info.body = bodyToByteArray(request);
    }

    return info;
  }

  private ResponseInfo convertResponse(Response response, ResponseBody body, int identifier) {

    List<NetworkReporter.Header> headers = convertHeader(response.headers());
    ResponseInfo info = new ResponseInfo();
    info.requestId = String.valueOf(identifier);
    info.timeStamp = response.receivedResponseAtMillis();
    info.statusCode = response.code();
    info.headers = headers;
    try {
      info.body = body.bytes();
    } catch (IOException e) {
      Log.e("Sonar", e.toString());
    }
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

  private int randInt(int min, int max) {
    Random rand = new Random();
    int randomNum = rand.nextInt((max - min) + 1) + min;
    return randomNum;
  }
}
