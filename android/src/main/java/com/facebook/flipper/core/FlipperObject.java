/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

import java.util.Arrays;
import javax.annotation.Nullable;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class FlipperObject {
  final JSONObject mJson;

  public FlipperObject(JSONObject json) {
    mJson = (json != null ? json : new JSONObject());
  }

  public FlipperObject(String json) {
    try {
      mJson = new JSONObject(json);
    } catch (JSONException e) {
      throw new RuntimeException(e);
    }
  }

  public FlipperDynamic getDynamic(String name) {
    return new FlipperDynamic(mJson.opt(name));
  }

  public String getString(String name) {
    if (mJson.isNull(name)) {
      return null;
    }
    return mJson.optString(name);
  }

  public int getInt(String name) {
    return mJson.optInt(name);
  }

  public long getLong(String name) {
    return mJson.optLong(name);
  }

  public float getFloat(String name) {
    return (float) mJson.optDouble(name);
  }

  public double getDouble(String name) {
    return mJson.optDouble(name);
  }

  public boolean getBoolean(String name) {
    return mJson.optBoolean(name);
  }

  public FlipperObject getObject(String name) {
    final Object o = mJson.opt(name);
    return new FlipperObject((JSONObject) o);
  }

  public FlipperArray getArray(String name) {
    final Object o = mJson.opt(name);
    return new FlipperArray((JSONArray) o);
  }

  public Object get(String name) {
    final Object o = mJson.opt(name);

    if (o instanceof JSONObject) {
      return new FlipperObject((JSONObject) o);
    } else if (o instanceof JSONArray) {
      return new FlipperArray((JSONArray) o);
    } else {
      return o;
    }
  }

  public boolean contains(String name) {
    return mJson.has(name);
  }

  public String toJsonString() {
    return toString();
  }

  @Override
  public String toString() {
    return mJson.toString();
  }

  @Override
  public boolean equals(@Nullable Object o) {
    if (o == null) {
      return false;
    } else {
      return mJson.toString().equals(o.toString());
    }
  }

  @Override
  public int hashCode() {
    return mJson.hashCode();
  }

  public static class Builder {
    private final JSONObject mJson;

    public Builder() {
      mJson = new JSONObject();
    }

    public Builder put(String name, Object obj) {
      if (obj == null) {
        return put(name, (String) null);
      } else if (obj instanceof Integer) {
        return put(name, (Integer) obj);
      } else if (obj instanceof Long) {
        return put(name, (Long) obj);
      } else if (obj instanceof Float) {
        return put(name, (Float) obj);
      } else if (obj instanceof Double) {
        return put(name, (Double) obj);
      } else if (obj instanceof String) {
        return put(name, (String) obj);
      } else if (obj instanceof Boolean) {
        return put(name, (Boolean) obj);
      } else if (obj instanceof Object[]) {
        return put(name, Arrays.deepToString((Object[]) obj));
      } else if (obj instanceof FlipperObject) {
        return put(name, (FlipperObject) obj);
      } else if (obj instanceof FlipperObject.Builder) {
        return put(name, (FlipperObject.Builder) obj);
      } else if (obj instanceof FlipperArray) {
        return put(name, (FlipperArray) obj);
      } else if (obj instanceof FlipperArray.Builder) {
        return put(name, (FlipperArray.Builder) obj);
      } else if (obj instanceof FlipperValue) {
        return put(name, ((FlipperValue) obj).toFlipperObject());
      } else {
        return put(name, obj.toString());
      }
    }

    public Builder put(String name, String s) {
      try {
        mJson.put(name, s);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, Integer i) {
      try {
        mJson.put(name, i);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, Long l) {
      try {
        mJson.put(name, l);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, Float f) {
      try {
        mJson.put(name, Float.isNaN(f) ? null : f);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, Double d) {
      try {
        mJson.put(name, Double.isNaN(d) ? null : d);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, Boolean b) {
      try {
        mJson.put(name, b);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, FlipperValue v) {
      return put(name, v.toFlipperObject());
    }

    public Builder put(String name, FlipperArray a) {
      try {
        mJson.put(name, a == null ? null : a.mJson);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, FlipperArray.Builder b) {
      return put(name, b.build());
    }

    public Builder put(String name, FlipperObject o) {
      try {
        mJson.put(name, o == null ? null : o.mJson);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, FlipperObject.Builder b) {
      return put(name, b.build());
    }

    public FlipperObject build() {
      return new FlipperObject(mJson);
    }
  }
}
