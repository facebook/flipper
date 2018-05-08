/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.core;

import java.util.Arrays;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class SonarObject {
  final JSONObject mJson;

  public SonarObject(JSONObject json) {
    mJson = (json != null ? json : new JSONObject());
  }

  public SonarObject(String json) {
    try {
      mJson = new JSONObject(json);
    } catch (JSONException e) {
      throw new RuntimeException(e);
    }
  }

  public SonarDynamic getDynamic(String name) {
    return new SonarDynamic(mJson.opt(name));
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

  public SonarObject getObject(String name) {
    final Object o = mJson.opt(name);
    return new SonarObject((JSONObject) o);
  }

  public SonarArray getArray(String name) {
    final Object o = mJson.opt(name);
    return new SonarArray((JSONArray) o);
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
  public boolean equals(Object o) {
    return mJson.toString().equals(o.toString());
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
      } else if (obj instanceof SonarObject) {
        return put(name, (SonarObject) obj);
      } else if (obj instanceof SonarObject.Builder) {
        return put(name, (SonarObject.Builder) obj);
      } else if (obj instanceof SonarArray) {
        return put(name, (SonarArray) obj);
      } else if (obj instanceof SonarArray.Builder) {
        return put(name, (SonarArray.Builder) obj);
      } else if (obj instanceof SonarValue) {
        return put(name, ((SonarValue) obj).toSonarObject());
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

    public Builder put(String name, SonarValue v) {
      return put(name, v.toSonarObject());
    }

    public Builder put(String name, SonarArray a) {
      try {
        mJson.put(name, a == null ? null : a.mJson);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, SonarArray.Builder b) {
      return put(name, b.build());
    }

    public Builder put(String name, SonarObject o) {
      try {
        mJson.put(name, o == null ? null : o.mJson);
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
      return this;
    }

    public Builder put(String name, SonarObject.Builder b) {
      return put(name, b.build());
    }

    public SonarObject build() {
      return new SonarObject(mJson);
    }
  }
}
