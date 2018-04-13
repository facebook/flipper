/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector;

import com.facebook.sonar.core.SonarArray;
import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import java.util.List;

/**
 * A NodeDescriptor is an object which known how to expose an Object of type T to the ew Inspector.
 * This class is the extension point for the Sonar inspector plugin and is how custom classes and
 * data can be exposed to the inspector.
 */
public abstract class NodeDescriptor<T> {
  private SonarConnection mConnection;
  private DescriptorMapping mDescriptorMapping;

  void setConnection(SonarConnection connection) {
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
  protected final NodeDescriptor<?> descriptorForClass(Class<?> clazz) {
    return mDescriptorMapping.descriptorForClass(clazz);
  }

  /**
   * Invalidate a node. This tells Sonar that this node is no longer valid and its properties and/or
   * children have changed. This will trigger Sonar to re-query this node getting any new data.
   */
  protected final void invalidate(final T node) {
    if (mConnection != null) {
      new ErrorReportingRunnable() {
        @Override
        protected void runOrThrow() throws Exception {
          SonarArray array =
              new SonarArray.Builder()
                  .put(new SonarObject.Builder().put("id", getId(node)).build())
                  .build();
          SonarObject params = new SonarObject.Builder().put("nodes", array).build();
          mConnection.send("invalidate", params);
        }
      }.run();
    }
  }

  protected final boolean connected() {
    return mConnection != null;
  }

  protected abstract class ErrorReportingRunnable
      extends com.facebook.sonar.core.ErrorReportingRunnable {
    public ErrorReportingRunnable() {
      super(mConnection);
    }
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

  /** @return The number of children this node exposes in the inspector. */
  public abstract int getChildCount(T node) throws Exception;

  /** @return The child at index. */
  public abstract Object getChildAt(T node, int index) throws Exception;

  /**
   * Get the data to show for this node in the sidebar of the inspector. The object will be showen
   * in order and with a header matching the given name.
   */
  public abstract List<Named<SonarObject>> getData(T node) throws Exception;

  /**
   * Set a value on the provided node at the given path. The path will match a key path in the data
   * provided by {@link this#getData(Object)} and the value will be of the same type as the value
   * mathcing that path in the returned object.
   */
  public abstract void setValue(T node, String[] path, SonarDynamic value) throws Exception;

  /**
   * Get the attributes for this node. This is a list of read-only string:string mapping which show
   * up inline in the elements inspector. See {@link Named} for more information.
   */
  public abstract List<Named<String>> getAttributes(T node) throws Exception;

  /**
   * Highlight this node. Use {@link HighlightedOverlay} if possible. This is used to highlight a
   * node which is selected in the inspector. The plugin automatically takes care of de-selecting
   * the previously highlighted node.
   */
  public abstract void setHighlighted(T node, boolean selected) throws Exception;

  /**
   * Perform hit testing on the given node. Either continue the search in a child with {@link
   * Touch#continueWithOffset(int, int, int)} or finish the hit testing on this node with {@link
   * Touch#finish()}
   */
  public abstract void hitTest(T node, Touch touch) throws Exception;

  /**
   * @return A string indicating how this element should be decorated. Check with the Sonar desktop
   *     app to see what values are supported.
   */
  public abstract String getDecoration(T node) throws Exception;

  /**
   * Test this node against a given query to see if it matches. This is used for finding search
   * results.
   */
  public abstract boolean matches(String query, T node) throws Exception;
}
