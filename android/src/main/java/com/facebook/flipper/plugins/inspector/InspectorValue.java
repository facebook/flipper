/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperValue;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class InspectorValue<T> implements FlipperValue {

  /**
   * Describe the type of data this value contains. This will influence how values are parsed and
   * displayed by the Flipper desktop app. For example colors will be parse as integers and
   * displayed using hex values and be editable using a color picker.
   *
   * <p>Do not extends this list of types without adding support for the type in the desktop
   * Inspector.
   */
  public static class Type<T> {

    public static final Type Auto = new Type<>("auto");
    public static final Type<String> Text = new Type<>("text");
    public static final Type<Number> Number = new Type<>("number");
    public static final Type<Boolean> Boolean = new Type<>("boolean");
    public static final Type<String> Enum = new Type<>("enum");
    public static final Type<Integer> Color = new Type<>("color");
    public static final Type<Picker> Picker = new Type<>("picker");
    public static final Type<Timeline> Timeline = new Type<>("timeline");

    private final String mName;

    Type(String name) {
      mName = name;
    }

    @Override
    public String toString() {
      return mName;
    }
  }

  final Type<T> mType;
  final T mValue;
  final boolean mMutable;

  private InspectorValue(Type<T> type, T value, boolean mutable) {
    mType = type;
    mValue = value;
    mMutable = mutable;
  }

  public static <T> InspectorValue<T> mutable(Type<T> type, T value) {
    return new InspectorValue<>(type, value, true);
  }

  public static <T> InspectorValue<T> immutable(Type<T> type, T value) {
    return new InspectorValue<>(type, value, false);
  }

  public static InspectorValue mutable(Object value) {
    return new InspectorValue<>(Type.Auto, value, true);
  }

  public static InspectorValue immutable(Object value) {
    return new InspectorValue<>(Type.Auto, value, false);
  }

  @Override
  public FlipperObject toFlipperObject() {
    return new FlipperObject.Builder()
        .put("__type__", mType)
        .put("__mutable__", mMutable)
        .put("value", mValue)
        .build();
  }

  public static final class Picker {
    public final Set<String> values;
    public final String selected;

    public Picker(Set<String> values, String selected) {
      this.values = values;
      this.selected = selected;
    }

    @Override
    public String toString() {
      // FIXME(festevezga) - Manually rolled json, #noragrets
      StringBuilder b = new StringBuilder();
      b.append("{ \"values\": ");
      b.append("[");
      int i = values.size();
      for (String value : values) {
        b.append('"').append(value).append('"');
        i--;
        if (i != 0) {
          b.append(",");
        }
      }
      b.append("]");
      b.append(", \"selected\": \"");
      b.append(selected);
      b.append("\"}");
      return b.toString();
    }
  }

  /**
   * A widget that represents a timeline. Each point has a moment to be placed on the timeline, and
   * a key to be identified as. The current field represents the key of the point in the timeline
   * that matches the current moment in time.
   */
  public static final class Timeline {
    public final List<TimePoint> time;
    public final String current;

    public Timeline(List<TimePoint> time, String current) {
      Collections.sort(
          time,
          new Comparator<TimePoint>() {
            @Override
            public int compare(TimePoint stringTimePointEntry, TimePoint t1) {
              return Float.compare(stringTimePointEntry.moment, t1.moment);
            }
          });
      this.time = time;
      this.current = current;
    }

    private JSONObject toJson() {
      final JSONArray points = new JSONArray();
      for (TimePoint value : time) {
        points.put(value.toJson());
      }
      try {
        return new JSONObject().put("time", points).put("current", current);
      } catch (JSONException t) {
        throw new RuntimeException(t);
      }
    }

    @Override
    public String toString() {
      return toJson().toString();
    }

    /**
     * An entry in the timeline, identified by its key. They're sorted in Flipper by moment, and are
     * rendered according to the display and color. Any additional properties attached to the point
     * will be displayed when it's selected.
     */
    public static final class TimePoint {
      public final long moment;
      public final String display;
      public final String color;
      public final String key;
      public final Map<String, String> properties;

      public TimePoint(
          String key, long moment, String display, String color, Map<String, String> properties) {
        this.key = key;
        this.moment = moment;
        this.display = display;
        this.color = color;
        this.properties = properties;
      }

      private JSONObject toJson() {
        try {
          return new JSONObject()
              .put("moment", moment)
              .put("display", display)
              .put("color", color)
              .put("key", key)
              .put("properties", new JSONObject(properties));
        } catch (JSONException t) {
          throw new RuntimeException(t);
        }
      }

      @Override
      public String toString() {
        return toJson().toString();
      }
    }
  }
}
