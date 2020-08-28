/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import androidx.annotation.Nullable;
import com.facebook.flipper.core.ErrorReportingRunnable;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import java.util.Collections;
import java.util.List;

/**
 * A NodeDescriptor is an object which known how to expose an Object of type T to the new Inspector.
 * This class is the extension point for the Flipper inspector plugin and is how custom classes and
 * data can be exposed to the inspector.
 */
public abstract class NodeDescriptor<T> {
  @Nullable protected FlipperConnection mConnection;

  // This field is not initialized until setDescriptorMapping is called
  @Nullable private DescriptorMapping mDescriptorMapping;

  void setConnection(FlipperConnection connection) {
    mConnection = connection;
  }

  void setDescriptorMapping(DescriptorMapping descriptorMapping) {
    mDescriptorMapping = descriptorMapping;
  }

  /**
   * @return The descriptor for a given class. This is useful for when a descriptor wants to
   *     delegate parts of its implementation to another descriptor, say the super class of the
   *     object it describes. This is highly encouraged instead of subclassing another descriptor
   *     class.
   */
  protected final @Nullable NodeDescriptor<?> descriptorForClass(Class<?> clazz) {
    if (mDescriptorMapping != null) {
      return mDescriptorMapping.descriptorForClass(clazz);
    }
    return null;
  }

  /**
   * Invalidate a node. This tells Flipper that this node is no longer valid and its properties
   * and/or children have changed. This will trigger Flipper to re-query this node getting any new
   * data.
   */
  public void invalidate(final T node) {
    if (mConnection != null) {
      new ErrorReportingRunnable(mConnection) {
        @Override
        protected void runOrThrow() throws Exception {
          FlipperArray array =
              new FlipperArray.Builder()
                  .put(new FlipperObject.Builder().put("id", getId(node)).build())
                  .build();
          FlipperObject params = new FlipperObject.Builder().put("nodes", array).build();
          mConnection.send("invalidate", params);
        }
      }.run();
    }
  }

  /**
   * Invalidate a node in the ax tree. This tells Flipper that this node is no longer valid and its
   * properties and/or children have changed. This will trigger Flipper to re-query this node
   * getting any new data.
   */
  protected final void invalidateAX(final T node) {
    if (mConnection != null) {
      new ErrorReportingRunnable(mConnection) {
        @Override
        protected void runOrThrow() throws Exception {
          FlipperArray array =
              new FlipperArray.Builder()
                  .put(new FlipperObject.Builder().put("id", getId(node)).build())
                  .build();
          FlipperObject params = new FlipperObject.Builder().put("nodes", array).build();
          mConnection.send("invalidateAX", params);
        }
      }.run();
    }
  }

  protected final boolean connected() {
    return mConnection != null;
  }

  /**
   * Initialize a node. This implementation usually consists of setting up listeners to know when to
   * call {@link NodeDescriptor#invalidate(Object)}.
   */
  public abstract void init(T node) throws Exception;

  /**
   * A globally unique ID used to identify a node in a hierarchy. If your node does not have a
   * globally unique ID it is fine to rely on {@link System#identityHashCode(Object)}.
   */
  public abstract String getId(T node) throws Exception;

  /**
   * The name used to identify this node in the inspector. Does not need to be unique. A good
   * default is to use the class name of the node.
   */
  public abstract String getName(T node) throws Exception;

  /** Gets name for AX tree. */
  public String getAXName(T node) throws Exception {
    return "";
  }

  /** @return The number of children this node exposes in the inspector. */
  public abstract int getChildCount(T node) throws Exception;

  /** Gets child at index for AX tree. Ignores non-view children. */
  public int getAXChildCount(T node) throws Exception {
    return getChildCount(node);
  }

  /** @return The child at index. */
  public abstract Object getChildAt(T node, int index) throws Exception;

  /** Gets child at index for AX tree. Ignores non-view children. */
  public @Nullable Object getAXChildAt(T node, int index) throws Exception {
    return getChildAt(node, index);
  }

  /**
   * Get the data to show for this node in the sidebar of the inspector. The object will be showen
   * in order and with a header matching the given name.
   */
  public abstract List<Named<FlipperObject>> getData(T node) throws Exception;

  /** Gets data for AX tree */
  public List<Named<FlipperObject>> getAXData(T node) throws Exception {
    return Collections.EMPTY_LIST;
  }

  /**
   * Set a value on the provided node at the given path. The path will match a key path in the data
   * provided by {@link this#getData(Object)} and the value will be of the same type as the value
   * mathcing that path in the returned object.
   */
  public abstract void setValue(
      T node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value)
      throws Exception;

  /**
   * Get the attributes for this node. This is a list of read-only string:string mapping which show
   * up inline in the elements inspector. See {@link Named} for more information.
   */
  public abstract List<Named<String>> getAttributes(T node) throws Exception;

  /** Gets attributes for AX tree */
  public List<Named<String>> getAXAttributes(T node) throws Exception {
    return Collections.EMPTY_LIST;
  }

  /**
   * Highlight this node. Use {@link HighlightedOverlay} if possible. This is used to highlight a
   * node which is selected in the inspector. The plugin automatically takes care of de-selecting
   * the previously highlighted node.
   */
  public abstract void setHighlighted(T node, boolean selected, boolean isAlignmentMode)
      throws Exception;

  /**
   * Perform hit testing on the given node. Either continue the search in a child with {@link
   * Touch#continueWithOffset(int, int, int)} or finish the hit testing on this node with {@link
   * Touch#finish()}
   */
  public abstract void hitTest(T node, Touch touch) throws Exception;

  /**
   * Perform hit testing on the given ax node. Either continue the search in an ax child with {@link
   * Touch#continueWithOffset(int, int, int, boolean)} or finish the hit testing on this ax node
   * with {@link Touch#finish()}
   */
  public void axHitTest(T node, Touch touch) throws Exception {
    touch.finish();
  }

  /**
   * @return A string indicating how this element should be decorated. Check with the Flipper
   *     desktop app to see what values are supported.
   */
  public abstract String getDecoration(T node) throws Exception;

  /**
   * @return A string indicating how this element should be decorated in the AX tree. Check with the
   *     Flipper desktop app to see what values are supported.
   */
  public String getAXDecoration(T node) throws Exception {
    return null;
  }

  /**
   * @return Extra data about the node indicating whether the node corresponds to a node in the
   *     other tree or if it is not represented in the other tree bu has children that should show
   *     up, etc.
   */
  public FlipperObject getExtraInfo(T node) {
    return new FlipperObject.Builder().build();
  }

  /**
   * Test this node against a given query to see if it matches. This is used for finding search
   * results.
   */
  public abstract boolean matches(String query, T node) throws Exception;
}
