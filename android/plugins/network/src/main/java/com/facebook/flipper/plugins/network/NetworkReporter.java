/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.network;

import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;

public interface NetworkReporter {
  void reportRequest(RequestInfo requestInfo);

  void reportResponse(ResponseInfo responseInfo);

  public class Header {
    public final String name;
    public final String value;

    public Header(final String name, final String value) {
      this.name = name;
      this.value = value;
    }

    @Override
    public String toString() {
      return "Header{" + name + ": " + value + "}";
    }
  }

  public class RequestInfo {
    public String requestId;
    public long timeStamp;
    public List<Header> headers = new ArrayList<>();
    public String method;
    public String uri;
    public byte[] body;

    public Header getFirstHeader(final String name) {
      for (Header header : headers) {
        if (name.equalsIgnoreCase(header.name)) {
          return header;
        }
      }
      return null;
    }
  }

  public class ResponseInfo {
    public String requestId;
    public long timeStamp;
    public int statusCode;
    public String statusReason;
    public List<Header> headers = new ArrayList<>();
    public @Nullable byte[] body;
    public boolean isMock = false;

    public Header getFirstHeader(final String name) {
      for (Header header : headers) {
        if (name.equalsIgnoreCase(header.name)) {
          return header;
        }
      }
      return null;
    }
  }
}
