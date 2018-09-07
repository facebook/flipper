/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector;

import android.app.Application;
import android.content.Context;
import android.support.v4.view.ViewCompat;
import android.view.accessibility.AccessibilityEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import com.facebook.sonar.core.ErrorReportingRunnable;
import com.facebook.sonar.core.SonarArray;
import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.core.SonarPlugin;
import com.facebook.sonar.core.SonarReceiver;
import com.facebook.sonar.core.SonarResponder;
import com.facebook.sonar.plugins.common.MainThreadSonarReceiver;
import com.facebook.sonar.plugins.console.iface.ConsoleCommandReceiver;
import com.facebook.sonar.plugins.console.iface.NullScriptingEnvironment;
import com.facebook.sonar.plugins.console.iface.ScriptingEnvironment;
import com.facebook.sonar.plugins.inspector.descriptors.ApplicationDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.utils.AccessibilityUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Stack;
import javax.annotation.Nullable;

public class InspectorSonarPlugin implements SonarPlugin {

  private ApplicationWrapper mApplication;
  private DescriptorMapping mDescriptorMapping;
  private ObjectTracker mObjectTracker;
  private ScriptingEnvironment mScriptingEnvironment;
  private String mHighlightedId;
  private TouchOverlayView mTouchOverlay;
  private SonarConnection mConnection;
  private @Nullable List<ExtensionCommand> mExtensionCommands;
  private boolean mShowLithoAccessibilitySettings;

  /** An interface for extensions to the Inspector Sonar plugin */
  public interface ExtensionCommand {
    /** The command to respond to */
    String command();
    /** The corresponding SonarReceiver for the command */
    SonarReceiver receiver(ObjectTracker tracker, SonarConnection connection);
  }

  private static Application getAppContextFromContext(Context context) {
    Context nonNullContext =
        context.getApplicationContext() == null ? context : context.getApplicationContext();
    return (Application) context;
  }

  public InspectorSonarPlugin(Context context, DescriptorMapping descriptorMapping) {
    this(getAppContextFromContext(context), descriptorMapping, new NullScriptingEnvironment());
  }

  public InspectorSonarPlugin(
      Context context,
      DescriptorMapping descriptorMapping,
      ScriptingEnvironment scriptingEnvironment) {
    this(
        new ApplicationWrapper(getAppContextFromContext(context)),
        descriptorMapping,
        scriptingEnvironment,
        null);
  }

  public InspectorSonarPlugin(
      Context context,
      DescriptorMapping descriptorMapping,
      @Nullable List<ExtensionCommand> extensions) {
    this(
        new ApplicationWrapper(getAppContextFromContext(context)),
        descriptorMapping,
        new NullScriptingEnvironment(),
        extensions);
  }

  public InspectorSonarPlugin(
      Context context,
      DescriptorMapping descriptorMapping,
      ScriptingEnvironment scriptingEnvironment,
      @Nullable List<ExtensionCommand> extensions) {

    this(
        new ApplicationWrapper(getAppContextFromContext(context)),
        descriptorMapping,
        scriptingEnvironment,
        extensions);
  }

  // Package visible for testing
  InspectorSonarPlugin(
      ApplicationWrapper wrapper,
      DescriptorMapping descriptorMapping,
      ScriptingEnvironment scriptingEnvironment,
      @Nullable List<ExtensionCommand> extensions) {
    mDescriptorMapping = descriptorMapping;

    mObjectTracker = new ObjectTracker();
    mApplication = wrapper;
    mScriptingEnvironment = scriptingEnvironment;
    mExtensionCommands = extensions;
    mShowLithoAccessibilitySettings = false;
  }

  @Override
  public String getId() {
    return "Inspector";
  }

  @Override
  public void onConnect(SonarConnection connection) throws Exception {
    mConnection = connection;
    mDescriptorMapping.onConnect(connection);

    ConsoleCommandReceiver.listenForCommands(
        connection,
        mScriptingEnvironment,
        new ConsoleCommandReceiver.ContextProvider() {
          @Override
          @Nullable
          public Object getObjectForId(String id) {
            return mObjectTracker.get(id);
          }
        });
    connection.receive("getRoot", mGetRoot);
    connection.receive("getNodes", mGetNodes);
    connection.receive("setData", mSetData);
    connection.receive("setHighlighted", mSetHighlighted);
    connection.receive("setSearchActive", mSetSearchActive);
    connection.receive("isSearchActive", mIsSearchActive);
    connection.receive("getSearchResults", mGetSearchResults);
    connection.receive("getAXRoot", mGetAXRoot);
    connection.receive("getAXNodes", mGetAXNodes);
    connection.receive("onRequestAXFocus", mOnRequestAXFocus);
    connection.receive("shouldShowLithoAccessibilitySettings", mShouldShowLithoAccessibilitySettings);

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

  final SonarReceiver mShouldShowLithoAccessibilitySettings =
          new MainThreadSonarReceiver(mConnection) {
            @Override
            public void onReceiveOnMainThread(SonarObject params, SonarResponder responder)
                    throws Exception {
              responder.success(new SonarObject.Builder().put("showLithoAccessibilitySettings", mShowLithoAccessibilitySettings).build());
            }
          };

  final SonarReceiver mGetRoot =
      new MainThreadSonarReceiver(mConnection) {
        @Override
        public void onReceiveOnMainThread(SonarObject params, SonarResponder responder)
            throws Exception {
          responder.success(getNode(trackObject(mApplication)));
        }
      };

  final SonarReceiver mGetAXRoot =
      new MainThreadSonarReceiver(mConnection) {
        @Override
        public void onReceiveOnMainThread(SonarObject params, SonarResponder responder)
            throws Exception {
          // applicationWrapper is not used by accessibility, but is a common ancestor for multiple view roots
          responder.success(getAXNode(trackObject(mApplication)));
        }
      };

  final SonarReceiver mGetNodes =
      new MainThreadSonarReceiver(mConnection) {
        @Override
        public void onReceiveOnMainThread(final SonarObject params, final SonarResponder responder)
            throws Exception {
          final SonarArray ids = params.getArray("ids");
          final SonarArray.Builder result = new SonarArray.Builder();

          for (int i = 0, count = ids.length(); i < count; i++) {
            final String id = ids.getString(i);
            final SonarObject node = getNode(id);
            if (node != null) {
              result.put(node);
            } else {
              responder.error(
                  new SonarObject.Builder()
                      .put("message", "No node with given id")
                      .put("id", id)
                      .build());
              return;
            }
          }

          responder.success(new SonarObject.Builder().put("elements", result).build());
        }
      };

  final SonarReceiver mGetAXNodes =
      new MainThreadSonarReceiver(mConnection) {
        @Override
        public void onReceiveOnMainThread(final SonarObject params, final SonarResponder responder)
            throws Exception {
          final SonarArray ids = params.getArray("ids");
          final SonarArray.Builder result = new SonarArray.Builder();

          // getNodes called to refresh accessibility focus
          final boolean forAccessibilityEvent = params.getBoolean("forAccessibilityEvent");
          final String selected = params.getString("selected");

          for (int i = 0, count = ids.length(); i < count; i++) {
            final String id = ids.getString(i);
            final SonarObject node = getAXNode(id);

            // sent request for non-existent node, potentially in error
            if (node == null) {

              // some nodes may be null since we are searching through all current and previous known nodes
              if (forAccessibilityEvent) {
                continue;
              }

              responder.error(
                      new SonarObject.Builder()
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
          responder.success(new SonarObject.Builder().put("elements", result).build());
        }
      };

  final SonarReceiver mOnRequestAXFocus =
          new MainThreadSonarReceiver(mConnection) {
            @Override
            public void onReceiveOnMainThread(final SonarObject params, final SonarResponder responder)
                    throws Exception {
              final String nodeId = params.getString("id");

              final Object obj = mObjectTracker.get(nodeId);
              if (obj == null || !(obj instanceof View)) {
                return;
              }

              ((View) obj).sendAccessibilityEvent(AccessibilityEvent.TYPE_VIEW_FOCUSED);
            }
          };

  final SonarReceiver mSetData =
      new MainThreadSonarReceiver(mConnection) {
        @Override
        public void onReceiveOnMainThread(final SonarObject params, SonarResponder responder)
            throws Exception {
          final String nodeId = params.getString("id");
          final boolean ax = params.getBoolean("ax");
          final SonarArray keyPath = params.getArray("path");
          final SonarDynamic value = params.getDynamic("value");

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
          responder.success(ax ? getAXNode(nodeId): null);
        }
      };

  final SonarReceiver mSetHighlighted =
      new MainThreadSonarReceiver(mConnection) {
        @Override
        public void onReceiveOnMainThread(final SonarObject params, SonarResponder responder)
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

  final SonarReceiver mSetSearchActive =
      new MainThreadSonarReceiver(mConnection) {
        @Override
        public void onReceiveOnMainThread(final SonarObject params, SonarResponder responder)
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
              mTouchOverlay = new TouchOverlayView(root.getContext());
              root.addView(mTouchOverlay);
              root.bringChildToFront(mTouchOverlay);
            } else {
              root.removeView(mTouchOverlay);
              mTouchOverlay = null;
            }
          }
        }
      };

  final SonarReceiver mIsSearchActive =
          new MainThreadSonarReceiver(mConnection) {
            @Override
            public void onReceiveOnMainThread(final SonarObject params, SonarResponder responder)
                    throws Exception {
              responder.success(new SonarObject.Builder().put("isSearchActive", ApplicationDescriptor.getSearchActive()).build());
            }
          };

  final SonarReceiver mGetSearchResults =
      new MainThreadSonarReceiver(mConnection) {
        @Override
        public void onReceiveOnMainThread(SonarObject params, SonarResponder responder)
            throws Exception {
          final String query = params.getString("query");
          final boolean axEnabled = params.getBoolean("axEnabled");

          final SearchResultNode matchTree = searchTree(query.toLowerCase(), mApplication, axEnabled);
          final SonarObject results = matchTree == null ? null : matchTree.toSonarObject();
          final SonarObject response =
              new SonarObject.Builder().put("results", results).put("query", query).build();
          responder.success(response);
        }
      };

  class TouchOverlayView extends View implements HiddenNode {
    public TouchOverlayView(Context context) {
      super(context);
      setBackgroundColor(BoundsDrawable.COLOR_HIGHLIGHT_CONTENT);
    }

    @Override
    public boolean onHoverEvent(MotionEvent event) {

      // if in layout inspector and talkback is running, override the first click to locate the clicked view
      if (mConnection != null && AccessibilityUtil.isTalkbackEnabled(getContext()) && event.getPointerCount() == 1) {
        SonarObject params = new SonarObject.Builder()
                .put("type", "usage")
                .put("eventName", "accessibility:clickToInspectTalkbackRunning").build();
        mConnection.send("track", params);

        final int action = event.getAction();
        switch (action) {
          case MotionEvent.ACTION_HOVER_ENTER: {
            event.setAction(MotionEvent.ACTION_DOWN);
          } break;
          case MotionEvent.ACTION_HOVER_MOVE: {
            event.setAction(MotionEvent.ACTION_MOVE);
          } break;
          case MotionEvent.ACTION_HOVER_EXIT: {
            event.setAction(MotionEvent.ACTION_UP);
          } break;
        }
        return onTouchEvent(event);
      }

      // otherwise use the default
      return super.onHoverEvent(event);
    }

    @Override
    public boolean onTouchEvent(final MotionEvent event) {
      if (event.getAction() != MotionEvent.ACTION_UP) {
        return true;
      }

      new ErrorReportingRunnable(mConnection) {
        @Override
        public void runOrThrow() throws Exception {
          hitTest((int) event.getX(), (int) event.getY());
        }
      }.run();

      return true;
    }
  }

  private Touch createTouch(final int touchX, final int touchY, final boolean ax) throws Exception {
    final SonarArray.Builder path = new SonarArray.Builder();
    path.put(trackObject(mApplication));

    return new Touch() {
      int x = touchX;
      int y = touchY;
      Object node = mApplication;


      @Override
      public void finish() {
        mConnection.send(ax ? "selectAX" : "select", new SonarObject.Builder().put("path", path).build());
      }

      @Override
      public void continueWithOffset(
              final int childIndex, final int offsetX, final int offsetY) {
        final Touch touch = this;

        new ErrorReportingRunnable(mConnection) {
          @Override
          protected void runOrThrow() throws Exception {
            x -= offsetX;
            y -= offsetY;

            if (ax) {
              node = assertNotNull(descriptorForObject(node).getAXChildAt(node, childIndex));
            } else {
              node = assertNotNull(descriptorForObject(node).getChildAt(node, childIndex));
            }

            path.put(trackObject(node));
            final NodeDescriptor<Object> descriptor = descriptorForObject(node);

            if (ax) {
              descriptor.axHitTest(node, touch);
            } else {
              descriptor.hitTest(node, touch);
            }
          }
        }.run();
      }

      @Override
      public boolean containedIn(int l, int t, int r, int b) {
        return x >= l && x <= r && y >= t && y <= b;
      }
    };
  }

  void hitTest(final int touchX, final int touchY) throws Exception {
    final NodeDescriptor<Object> descriptor = descriptorForObject(mApplication);
    descriptor.hitTest(mApplication, createTouch(touchX, touchY, false));
    descriptor.axHitTest(mApplication, createTouch(touchX, touchY, true));
  }

  private void setHighlighted(final String id, final boolean highlighted, final boolean isAlignmentMode) throws Exception {
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

  private boolean hasAXNode(SonarObject node) {
    SonarObject extraInfo = node.getObject("extraInfo");
    return extraInfo != null && extraInfo.getBoolean("hasAXNode");
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
      SonarObject node = getNode(id);
      return new SearchResultNode(id, isMatch, node, childTrees, axEnabled && hasAXNode(node) ? getAXNode(id) : null);
    }
    return null;
  }

  private @Nullable SonarObject getNode(String id) throws Exception {
    final Object obj = mObjectTracker.get(id);
    if (obj == null) {
      return null;
    }

    final NodeDescriptor<Object> descriptor = descriptorForObject(obj);
    if (descriptor == null) {
      return null;
    }

    final SonarArray.Builder children = new SonarArray.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (int i = 0, count = descriptor.getChildCount(obj); i < count; i++) {
          final Object child = assertNotNull(descriptor.getChildAt(obj, i));
          children.put(trackObject(child));
        }
      }
    }.run();

    final SonarObject.Builder data = new SonarObject.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (Named<SonarObject> props : descriptor.getData(obj)) {
          data.put(props.getName(), props.getValue());
        }
      }
    }.run();

    final SonarArray.Builder attributes = new SonarArray.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (Named<String> attribute : descriptor.getAttributes(obj)) {
          attributes.put(
              new SonarObject.Builder()
                  .put("name", attribute.getName())
                  .put("value", attribute.getValue())
                  .build());
        }
      }
    }.run();

    return new SonarObject.Builder()
        .put("id", descriptor.getId(obj))
        .put("name", descriptor.getName(obj))
        .put("data", data)
        .put("children", children)
        .put("attributes", attributes)
        .put("decoration", descriptor.getDecoration(obj))
        .put("extraInfo", descriptor.getExtraInfo(obj))
        .build();
  }

  private @Nullable SonarObject getAXNode(String id) throws Exception {

    final Object obj = mObjectTracker.get(id);
    if (obj == null) {
      return null;
    }

    final NodeDescriptor<Object> descriptor = descriptorForObject(obj);
    if (descriptor == null) {
      return null;
    }

    final SonarArray.Builder children = new SonarArray.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (int i = 0, count = descriptor.getAXChildCount(obj); i < count; i++) {
          final Object child = assertNotNull(descriptor.getAXChildAt(obj, i));
          children.put(trackObject(child));
        }
      }
    }.run();

    final SonarObject.Builder data = new SonarObject.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (Named<SonarObject> props : descriptor.getAXData(obj)) {
          data.put(props.getName(), props.getValue());
        }
      }
    }.run();

    final SonarArray.Builder attributes = new SonarArray.Builder();
    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (Named<String> attribute : descriptor.getAXAttributes(obj)) {
          attributes.put(
              new SonarObject.Builder()
                  .put("name", attribute.getName())
                  .put("value", attribute.getValue())
                  .build());
        }
      }
    }.run();

    String name = descriptor.getAXName(obj);
    name = name.substring(name.lastIndexOf('.') + 1);

    return new SonarObject.Builder()
        .put("id", descriptor.getId(obj))
        .put("name", name)
        .put("data", data)
        .put("children", children)
        .put("attributes", attributes)
        .put("decoration", descriptor.getAXDecoration(obj))
        .put("extraInfo", descriptor.getExtraInfo(obj))
        .build();
  }

  private String trackObject(Object obj) throws Exception {
    final NodeDescriptor<Object> descriptor = descriptorForObject(obj);
    final String id = descriptor.getId(obj);
    final Object curr = mObjectTracker.get(id);
    if (obj != curr) {
      mObjectTracker.put(id, obj);
      descriptor.init(obj);
    }
    return id;
  }

  private NodeDescriptor<Object> descriptorForObject(Object obj) {
    final Class c = assertNotNull(obj).getClass();
    return (NodeDescriptor<Object>) mDescriptorMapping.descriptorForClass(c);
  }

  private static Object assertNotNull(@Nullable Object o) {
    if (o == null) {
      throw new AssertionError("Unexpected null value");
    }
    return o;
  }
}
