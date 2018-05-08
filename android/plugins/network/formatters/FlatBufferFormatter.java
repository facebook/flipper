/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.network.formatters;

import android.os.AsyncTask;
import com.facebook.sonar.plugins.network.NetworkReporter.Header;
import com.facebook.sonar.plugins.network.NetworkReporter.ResponseInfo;
import com.facebook.sonar.plugins.network.NetworkResponseFormatter;
import com.facebook.tools.flatbuffer.FlatBufferBatchResponsesVisualizer;
import com.facebook.tools.flatbuffer.IdlFlatbufferVisualizer;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class FlatBufferFormatter implements NetworkResponseFormatter {
  private static final String SCHEMA_ENDPOINT =
      "http://our.graph.prod.intern.facebook.com/intern/flatbuffer_schema/";

  public boolean shouldFormat(ResponseInfo response) {
    final Header schemaIdHeader = response.getFirstHeader("x-flatbuffer-schema-id");
    return schemaIdHeader != null;
  }

  public void format(
      final ResponseInfo response,
      final NetworkResponseFormatter.OnCompletionListener onCompletionListener) {
    final Header schemaIdHeader = response.getFirstHeader("x-flatbuffer-schema-id");
    final String schemaId = schemaIdHeader.value;

    AsyncTask.execute(
        new Runnable() {
          @Override
          public void run() {
            try {
              final InputStream flatBuffer = new ByteArrayInputStream(response.body);
              final URL schemaUrl = new URL(SCHEMA_ENDPOINT + schemaId);
              final HttpURLConnection connection = (HttpURLConnection) schemaUrl.openConnection();
              final InputStream schemaStream = connection.getInputStream();
              String schema = readAsUTF8(schemaStream);
              schemaStream.close();

              // need to parse schema because the schema downloaded has a forever loop
              // prepended to prevent CSRF
              schema = schema.substring(schema.indexOf('{'));

              if (schema.contains("\"idl\"")) {
                schema = schema.replaceAll("\\\\n", " ");
                onCompletionListener.onCompletion(
                    IdlFlatbufferVisualizer.convertStreamToJson(flatBuffer, schema).toString());
              } else {
                final DataInputStream dis = new DataInputStream(flatBuffer);
                onCompletionListener.onCompletion(
                    FlatBufferBatchResponsesVisualizer.parseBatchResponsesToJson(dis, schema)
                        .toString());
              }
            } catch (Exception e) {
              e.printStackTrace();
            }
          }
        });
  }

  private static String readAsUTF8(InputStream is) throws IOException {
    ByteArrayOutputStream os = new ByteArrayOutputStream();
    copy(is, os, new byte[1024]);
    return os.toString("UTF-8");
  }

  private static void copy(InputStream is, OutputStream os, byte[] buffer) throws IOException {
    int n;
    while ((n = is.read(buffer)) != -1) {
      os.write(buffer, 0, n);
    }
  }
}
