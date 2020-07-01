/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import android.app.Application;
import android.content.Context;
import android.view.View;
import android.view.ViewGroup;
import android.view.accessibility.AccessibilityEvent;
import com.facebook.flipper.core.ErrorReportingRunnable;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.plugins.common.MainThreadFlipperReceiver;
import com.facebook.flipper.plugins.inspector.descriptors.ApplicationDescriptor;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;

public class InspectorFlipperPlugin implements FlipperPlugin {

  private ApplicationWrapper mApplication;
  private DescriptorMapping mDescriptorMapping;
  private ObjectTracker mObjectTracker;
  private String mHighlightedId;
  TouchOverlayView mTouchOverlay;
  private FlipperConnection mConnection;
  private @Nullable List<ExtensionCommand> mExtensionCommands;
  private boolean mShowLithoAccessibilitySettings;

  /** An interface for extensions to the Inspector Flipper plugin */
  public interface ExtensionCommand {
    /** The command to respond to */
    String command();
    /** The corresponding FlipperReceiver for the command */
    FlipperReceiver receiver(ObjectTracker tracker, FlipperConnection connection);
  }

  private static Application getAppContextFromContext(Context context) {
    Context nonNullContext =
        context.getApplicationContext() == null ? context : context.getApplicationContext();
    return (Application) context;
  }

  public InspectorFlipperPlugin(Context context, DescriptorMapping descriptorMapping) {
    this(new ApplicationWrapper(getAppContextFromContext(context)), descriptorMapping, null);
  }

  public InspectorFlipperPlugin(
      Context context,
      DescriptorMapping descriptorMapping,
      @Nullable List<ExtensionCommand> extensions) {

    this(new ApplicationWrapper(getAppContextFromContext(context)), descriptorMapping, extensions);
  }

  // Package visible for testing
  InspectorFlipperPlugin(
      ApplicationWrapper wrapper,
      DescriptorMapping descriptorMapping,
      @Nullable List<ExtensionCommand> extensions) {
    mDescriptorMapping = descriptorMapping;

    mObjectTracker = new ObjectTracker();
    mApplication = wrapper;
    mExtensionCommands = extensions;
    mShowLithoAccessibilitySettings = false;
  }

  @Override
  public String getId() {
    return "Inspector";
  }

  @Override
  public void onConnect(FlipperConnection connection) throws Exception {
    mConnection = connection;
    mDescriptorMapping.onConnect(connection);

    connection.receive("getRoot", mGetRoot);
    connection.receive("getAllNodes", mGetAllNodes);
    connection.receive("getNodes", mGetNodes);
    connection.receive("setData", mSetData);
    connection.receive("setHighlighted", mSetHighlighted);
    connection.receive("setSearchActive", mSetSearchActive);
    connection.receive("isSearchActive", mIsSearchActive);
    connection.receive("getSearchResults", mGetSearchResults);
    connection.receive("getAXRoot", mGetAXRoot);
    connection.receive("getAXNodes", mGetAXNodes);
    connection.receive("onRequestAXFocus", mOnRequestAXFocus);
    connection.receive(
        "shouldShowLithoAccessibilitySettings", mShouldShowLithoAccessibilitySettings);

    if (mExtensionCommands != null) {
      for (ExtensionCommand extensionCommand : mExtensionCommands) {
        if (extensionCommand.command().equals("forceLithoAXRender")) {
          mShowLithoAccessibilitySettings = true;
        }
        connection.receive(
            extensionCommand.command(), extensionCommand.receiver(mObjectTracker, mConnection));
      }
    }
  }

  @Override
  public void onDisconnect() throws Exception {
    if (mHighlightedId != null) {
      setHighlighted(mHighlightedId, false, false);
      mHighlightedId = null;
    }

    // remove any added accessibility delegates, leave isSearchActive untouched
    ApplicationDescriptor.clearEditedDelegates();

    mObjectTracker.clear();
    mDescriptorMapping.onDisconnect();
    mConnection = null;
  }

  @Override
  public boolean runInBackground() {
    return true;
  }

  final FlipperReceiver mShouldShowLithoAccessibilitySettings =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(FlipperObject params, FlipperResponder responder)
            throws Exception {
          responder.success(
              new FlipperObject.Builder()
                  .put("showLithoAccessibilitySettings", mShowLithoAccessibilitySettings)
                  .build());
        }
      };

  final FlipperReceiver mGetRoot =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(FlipperObject params, FlipperResponder responder)
            throws Exception {
          responder.success(getNode(trackObject(mApplication)));
        }
      };

  final FlipperReceiver mGetAXRoot =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(FlipperObject params, FlipperResponder responder)
            throws Exception {
          // applicationWrapper is not used by accessibility, but is a common ancestor for multiple
          // view roots
          responder.success(getAXNode(trackObject(mApplication)));
        }
      };
  final FlipperReceiver mGetAllNodes =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(
            final FlipperObject params, final FlipperResponder responder) throws Exception {
          final FlipperObject.Builder result = new FlipperObject.Builder();
          final FlipperObject.Builder AXResults = new FlipperObject.Builder();

          String rootID = trackObject(mApplication);
          populateAllAXNodes(rootID, AXResults);
          populateAllNodes(rootID, result);
          final FlipperObject output =
              new FlipperObject.Builder()
                  .put(
                      "allNodes",
                      new FlipperObject.Builder()
                          .put("elements", result.build())
                          .put("AXelements", AXResults.build())
                          .put("rootElement", rootID)
                          .put("rootAXElement", rootID)
                          .build())
                  .build();
          responder.success(output);
        }
      };

  final FlipperReceiver mGetNodes =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(
            final FlipperObject params, final FlipperResponder responder) throws Exception {
          final FlipperArray ids = params.getArray("ids");
          final FlipperArray.Builder result = new FlipperArray.Builder();

          for (int i = 0, count = ids.length(); i < count; i++) {
            final String id = ids.getString(i);
            final FlipperObject node = getNode(id);
            if (node != null) {
              result.put(node);
            } else {
              responder.error(
                  new FlipperObject.Builder()
                      .put("message", "No node with given id")
                      .put("id", id)
                      .build());
              return;
            }
          }

          responder.success(new FlipperObject.Builder().put("elements", result).build());
        }
      };

  void populateAllNodes(String rootNode, FlipperObject.Builder builder) throws Exception {
    FlipperObject object = getNode(rootNode);
    builder.put(rootNode, object);
    FlipperArray children = object.getArray("children");
    for (int i = 0, count = children.length(); i < count; ++i) {
      populateAllNodes(children.getString(i), builder);
    }
  }

  void populateAllAXNodes(String rootNode, FlipperObject.Builder builder) throws Exception {
    FlipperObject object = getAXNode(rootNode);
    builder.put(rootNode, object);
    FlipperArray children = object.getArray("children");
    for (int i = 0, count = children.length(); i < count; ++i) {
      populateAllAXNodes(children.getString(i), builder);
    }
  }

  final FlipperReceiver mGetAXNodes =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(
            final FlipperObject params, final FlipperResponder responder) throws Exception {
          final FlipperArray ids = params.getArray("ids");
          final FlipperArray.Builder result = new FlipperArray.Builder();

          // getNodes called to refresh accessibility focus
          final boolean forAccessibilityEvent = params.getBoolean("forAccessibilityEvent");
          final String selected = params.getString("selected");

          for (int i = 0, count = ids.length(); i < count; i++) {
            final String id = ids.getString(i);
            final FlipperObject node = getAXNode(id);

            // sent request for non-existent node, potentially in error
            if (node == null) {

              // some nodes may be null since we are searching through all current and previous
              // known nodes
              if (forAccessibilityEvent) {
                continue;
              }

              responder.error(
                  new FlipperObject.Builder()
                      .put("message", "No accessibility node with given id")
                      .put("id", id)
                      .build());
              return;
            } else {

              // always add currently selected node for live updates to the sidebar
              // also add focused node for updates
              if (forAccessibilityEvent) {
                if (id.equals(selected) || node.getObject("extraInfo").getBoolean("focused")) {
                  result.put(node);
                }

                // normal getNodes call, put any nodes in result
              } else {
                result.put(node);
              }
            }
          }
          responder.success(new FlipperObject.Builder().put("elements", result).build());
        }
      };

  final FlipperReceiver mOnRequestAXFocus =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(
            final FlipperObject params, final FlipperResponder responder) throws Exception {
          final String nodeId = params.getString("id");

          final Object obj = mObjectTracker.get(nodeId);
          if (obj == null || !(obj instanceof View)) {
            return;
          }

          ((View) obj).sendAccessibilityEvent(AccessibilityEvent.TYPE_VIEW_FOCUSED);
        }
      };

  final FlipperReceiver mSetData =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(final FlipperObject params, FlipperResponder responder)
            throws Exception {
          final String nodeId = params.getString("id");
          final boolean ax = params.getBoolean("ax");
          final FlipperArray keyPath = params.getArray("path");
          final FlipperDynamic value = params.getDynamic("value");

          final Object obj = mObjectTracker.get(nodeId);
          if (obj == null) {
            return;
          }

          final NodeDescriptor<Object> descriptor = descriptorForObject(obj);
          if (descriptor == null) {
            return;
          }

          final int count = keyPath.length();
          final String[] path = new String[count];
          for (int i = 0; i < count; i++) {
            path[i] = keyPath.getString(i);
          }

          descriptor.setValue(obj, path, value);
          responder.success(ax ? getAXNode(nodeId) : null);
        }
      };

  final FlipperReceiver mSetHighlighted =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(final FlipperObject params, FlipperResponder responder)
            throws Exception {
          final String nodeId = params.getString("id");
          final boolean isAlignmentMode = params.getBoolean("isAlignmentMode");

          if (mHighlightedId != null) {
            setHighlighted(mHighlightedId, false, isAlignmentMode);
          }

          if (nodeId != null) {
            setHighlighted(nodeId, true, isAlignmentMode);
          }
          mHighlightedId = nodeId;
        }
      };

  final FlipperReceiver mSetSearchActive =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(final FlipperObject params, FlipperResponder responder)
            throws Exception {
          final boolean active = params.getBoolean("active");
          ApplicationDescriptor.setSearchActive(active);
          final List<View> roots = mApplication.getViewRoots();

          ViewGroup root = null;
          for (int i = roots.size() - 1; i >= 0; i--) {
            if (roots.get(i) instanceof ViewGroup) {
              root = (ViewGroup) roots.get(i);
              break;
            }
          }

          if (root != null) {
            if (active) {
              mTouchOverlay =
                  new TouchOverlayView(root.getContext(), mConnection, mApplication) {
                    @Override
                    protected String trackObject(Object obj) throws Exception {
                      return InspectorFlipperPlugin.this.trackObject(obj);
                    }

                    @Override
                    protected NodeDescriptor<Object> descriptorForObject(Object obj) {
                      return InspectorFlipperPlugin.this.descriptorForObject(obj);
                    }
                  };
              root.addView(mTouchOverlay);
              root.bringChildToFront(mTouchOverlay);
            } else {
              root.removeView(mTouchOverlay);
              mTouchOverlay = null;
            }
          }
        }
      };

  final FlipperReceiver mIsSearchActive =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(final FlipperObject params, FlipperResponder responder)
            throws Exception {
          responder.success(
              new FlipperObject.Builder()
                  .put("isSearchActive", ApplicationDescriptor.getSearchActive())
                  .build());
        }
      };

  final FlipperReceiver mGetSearchResults =
      new MainThreadFlipperReceiver() {
        @Override
        public void onReceiveOnMainThread(FlipperObject params, FlipperResponder responder)
            throws Exception {
          final String query = params.getString("query");
          final boolean axEnabled = params.getBoolean("axEnabled");

          final SearchResultNode matchTree =
              searchTree(query.toLowerCase(), mApplication, axEnabled);
          final FlipperObject results = matchTree == null ? null : matchTree.toFlipperObject();
          final FlipperObject response =
              new FlipperObject.Builder().put("results", results).put("query", query).build();
          responder.success(response);
        }
      };

  private void setHighlighted(
      final String id, final boolean highlighted, final boolean isAlignmentMode) throws Exception {
    final Object obj = mObjectTracker.get(id);
    if (obj == null) {
      return;
    }

    final NodeDescriptor<Object> descriptor = descriptorForObject(obj);
    if (descriptor == null) {
      return;
    }

    descriptor.setHighlighted(obj, highlighted, isAlignmentMode);
  }

  private boolean hasAXNode(FlipperObject node) {
    FlipperObject extraInfo = node.getObject("extraInfo");
    return extraInfo != null && extraInfo.getBoolean("linkedNode");
  }

  public SearchResultNode searchTree(String query, Object obj, boolean axEnabled) throws Exception {
    final NodeDescriptor descriptor = descriptorForObject(obj);
    List<SearchResultNode> childTrees = null;
    boolean isMatch = descriptor.matches(query, obj);

    for (int i = 0; i < descriptor.getChildCount(obj); i++) {
      Object child = descriptor.getChildAt(obj, i);
      SearchResultNode childNode = searchTree(query, child, axEnabled);
      if (childNode != null) {
        if (childTrees == null) {
          childTrees = new ArrayList<>();
        }
        childTrees.add(childNode);
      }
    }

    if (isMatch || childTrees != null) {
      final String id = trackObject(obj);
      FlipperObject node = getNode(id);
      return new SearchResultNode(
          id, isMatch, node, childTrees, axEnabled && hasAXNode(node) ? getAXNode(id) : null);
    }
    return null;
  }

  private @Nullable FlipperObject getNode(String id) throws Exception {
    final Object obj = mObjectTracker.get(id);
    if (obj == null) {
      return null;
    }

    final NodeDescriptor<Object> descriptor = descriptorForObject(obj);
    if (descriptor == null) {
      return null;
    }

    final FlipperArray.Builder children = new FlipperArray.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (int i = 0, count = descriptor.getChildCount(obj); i < count; i++) {
          final Object child = assertNotNull(descriptor.getChildAt(obj, i));
          children.put(trackObject(child));
        }
      }
    }.run();

    final FlipperObject.Builder data = new FlipperObject.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (Named<FlipperObject> props : descriptor.getData(obj)) {
          data.put(props.getName(), props.getValue());
        }
      }
    }.run();

    final FlipperArray.Builder attributes = new FlipperArray.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (Named<String> attribute : descriptor.getAttributes(obj)) {
          attributes.put(
              new FlipperObject.Builder()
                  .put("name", attribute.getName())
                  .put("value", attribute.getValue())
                  .build());
        }
      }
    }.run();

    return new FlipperObject.Builder()
        .put("id", descriptor.getId(obj))
        .put("name", descriptor.getName(obj))
        .put("data", data)
        .put("children", children)
        .put("attributes", attributes)
        .put("decoration", descriptor.getDecoration(obj))
        .put("extraInfo", descriptor.getExtraInfo(obj))
        .build();
  }

  private @Nullable FlipperObject getAXNode(String id) throws Exception {

    final Object obj = mObjectTracker.get(id);
    if (obj == null) {
      return null;
    }

    final NodeDescriptor<Object> descriptor = descriptorForObject(obj);
    if (descriptor == null) {
      return null;
    }

    final FlipperArray.Builder children = new FlipperArray.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (int i = 0, count = descriptor.getAXChildCount(obj); i < count; i++) {
          final Object child = assertNotNull(descriptor.getAXChildAt(obj, i));
          children.put(trackObject(child));
        }
      }
    }.run();

    final FlipperObject.Builder data = new FlipperObject.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (Named<FlipperObject> props : descriptor.getAXData(obj)) {
          data.put(props.getName(), props.getValue());
        }
      }
    }.run();

    final FlipperArray.Builder attributes = new FlipperArray.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (Named<String> attribute : descriptor.getAXAttributes(obj)) {
          attributes.put(
              new FlipperObject.Builder()
                  .put("name", attribute.getName())
                  .put("value", attribute.getValue())
                  .build());
        }
      }
    }.run();

    String name = descriptor.getAXName(obj);
    name = name.substring(name.lastIndexOf('.') + 1);

    return new FlipperObject.Builder()
        .put("id", descriptor.getId(obj))
        .put("name", name)
        .put("data", data)
        .put("children", children)
        .put("attributes", attributes)
        .put("decoration", descriptor.getAXDecoration(obj))
        .put("extraInfo", descriptor.getExtraInfo(obj))
        .build();
  }

  String trackObject(Object obj) throws Exception {
    final NodeDescriptor<Object> descriptor = descriptorForObject(obj);
    final String id = descriptor.getId(obj);
    final Object curr = mObjectTracker.get(id);
    if (obj != curr) {
      mObjectTracker.put(id, obj);
      descriptor.init(obj);
    }
    return id;
  }

  NodeDescriptor<Object> descriptorForObject(Object obj) {
    final Class c = assertNotNull(obj).getClass();
    return (NodeDescriptor<Object>) mDescriptorMapping.descriptorForClass(c);
  }

  static Object assertNotNull(@Nullable Object o) {
    if (o == null) {
      throw new RuntimeException("Unexpected null value");
    }
    return o;
  }
}
