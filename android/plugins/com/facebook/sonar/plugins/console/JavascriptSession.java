/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.console;

import com.facebook.sonar.plugins.console.iface.ScriptingSession;
import java.io.Closeable;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.NativeJSON;
import org.mozilla.javascript.NativeJavaMethod;
import org.mozilla.javascript.NativeJavaObject;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;

public class JavascriptSession implements Closeable, ScriptingSession {

  private static final String TYPE = "type";
  private static final String VALUE = "value";
  public static final String JSON = "json";
  private final Context mContext;
  private final ContextFactory mContextFactory;
  private final Scriptable mScope;
  private final AtomicInteger lineNumber = new AtomicInteger(0);

  JavascriptSession(ContextFactory contextFactory, Map<String, Object> globals) {
    mContextFactory = contextFactory;
    mContext = contextFactory.enterContext();

    // Interpreted mode, or it will produce Dalvik incompatible bytecode.
    mContext.setOptimizationLevel(-1);
    mScope = mContext.initStandardObjects();

    for (Map.Entry<String, Object> entry : globals.entrySet()) {
      final Object value = entry.getValue();

      if (value instanceof Number || value instanceof String) {
        ScriptableObject.putConstProperty(mScope, entry.getKey(), entry.getValue());
      } else {
        // Calling java methods in the VM produces objects wrapped in NativeJava*.
        // So passing in wrapped objects keeps them consistent.
        ScriptableObject.putConstProperty(
            mScope,
            entry.getKey(),
            new NativeJavaObject(mScope, entry.getValue(), entry.getValue().getClass()));
      }
    }
  }

  @Override
  public JSONObject evaluateCommand(String userScript) throws JSONException {
    return evaluateCommand(userScript, mScope);
  }

  @Override
  public JSONObject evaluateCommand(String userScript, Object context) throws JSONException {
    Scriptable scope = new NativeJavaObject(mScope, context, context.getClass());
    return evaluateCommand(userScript, scope);
  }

  private JSONObject evaluateCommand(String command, Scriptable scope) throws JSONException {
    try {
      // This may be called by any thread, and contexts have to be entered in the current thread
      // before being used, so enter/exit every time.
      mContextFactory.enterContext();
      return toJson(
          mContext.evaluateString(
              scope, command, "sonar-console", lineNumber.incrementAndGet(), null));
    } finally {
      Context.exit();
    }
  }

  private JSONObject toJson(Object result) throws JSONException {

    if (result instanceof String) {
      return new JSONObject().put(TYPE, JSON).put(VALUE, result);
    }

    if (result instanceof Class) {
      return new JSONObject().put(TYPE, "class").put(VALUE, ((Class) result).getName());
    }

    if (result instanceof NativeJavaObject
        && ((NativeJavaObject) result).unwrap() instanceof String) {
      return new JSONObject().put(TYPE, JSON).put(VALUE, ((NativeJavaObject) result).unwrap());
    }

    if (result instanceof NativeJavaObject
        && ((NativeJavaObject) result).unwrap() instanceof Class) {
      return new JSONObject()
          .put(TYPE, "class")
          .put(VALUE, ((NativeJavaObject) result).unwrap().toString());
    }

    if (result instanceof NativeJavaObject) {
      final JSONObject o = new JSONObject();
      o.put("toString", ((NativeJavaObject) result).unwrap().toString());
      for (Object id : ((NativeJavaObject) result).getIds()) {
        if (id instanceof String) {
          final String name = (String) id;
          final Object value = ((NativeJavaObject) result).get(name, (NativeJavaObject) result);
          if (value != null && value instanceof NativeJavaMethod) {
            continue;
          }
          final String valueString = value == null ? null : safeUnwrap(value).toString();
          o.put(name, valueString);
        }
      }
      return new JSONObject().put(TYPE, "javaObject").put(VALUE, o);
    }

    if (result instanceof NativeJavaMethod) {
      final JSONObject o = new JSONObject();
      o.put(TYPE, "method");
      o.put("name", ((NativeJavaMethod) result).getFunctionName());
      return o;
    }

    if (result == null || result instanceof Undefined) {
      return new JSONObject().put(TYPE, "null");
    }

    if (result instanceof Function) {
      final JSONObject o = new JSONObject();
      o.put(TYPE, "function");
      o.put(VALUE, Context.toString(result));
      return o;
    }

    if (result instanceof ScriptableObject) {
      return new JSONObject()
          .put(TYPE, JSON)
          .put(
              VALUE,
              new JSONTokener(NativeJSON.stringify(mContext, mScope, result, null, null).toString())
                  .nextValue());
    }

    if (result instanceof Number) {
      return new JSONObject().put(TYPE, JSON).put(VALUE, result);
    }

    return new JSONObject().put(TYPE, "unknown").put(VALUE, result.toString());
  }

  @Override
  public void close() {
    Context.exit();
  }

  private static Object safeUnwrap(Object o) {
    if (o instanceof NativeJavaObject) {
      return ((NativeJavaObject) o).unwrap();
    }
    return o;
  }
}
