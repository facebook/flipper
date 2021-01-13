/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import static com.facebook.flipper.plugins.inspector.ThrowableMessageMatcher.hasThrowableWithMessage;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.hasItem;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.robolectric.annotation.LooperMode.Mode.LEGACY;

import android.app.Application;
import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.descriptors.ApplicationDescriptor;
import com.facebook.flipper.testing.FlipperConnectionMock;
import com.facebook.flipper.testing.FlipperResponderMock;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;
import org.hamcrest.CoreMatchers;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.LooperMode;

@LooperMode(LEGACY)
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 16)
public class InspectorFlipperPluginTest {

  private MockApplicationDescriptor mApplicationDescriptor;
  private DescriptorMapping mDescriptorMapping;
  private ApplicationWrapper mApp;

  @Before
  public void setup() {
    final Application app = Mockito.spy(RuntimeEnvironment.application);
    Mockito.when(app.getApplicationContext()).thenReturn(app);
    Mockito.when(app.getPackageName()).thenReturn("com.facebook.flipper");

    mDescriptorMapping = new DescriptorMapping();
    mApplicationDescriptor = new MockApplicationDescriptor();
    mDescriptorMapping.register(ApplicationWrapper.class, mApplicationDescriptor);
    mDescriptorMapping.register(TestNode.class, new TestNodeDescriptor());
    mApp = Mockito.spy(new ApplicationWrapper(app));
  }

  @Test
  public void testOnConnect() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperConnection connection = new FlipperConnectionMock();

    plugin.onConnect(connection);
    assertThat(mApplicationDescriptor.connected(), equalTo(true));
  }

  @Test
  public void testOnDisconnect() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperConnection connection = new FlipperConnectionMock();

    plugin.onConnect(connection);
    plugin.onDisconnect();
    assertThat(mApplicationDescriptor.connected(), equalTo(false));
  }

  @Test
  public void testGetRoot() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperResponderMock responder = new FlipperResponderMock();
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    mApplicationDescriptor.root = root;
    plugin.mGetRoot.onReceive(null, responder);

    assertThat(
        responder.successes,
        hasItem(
            new FlipperObject.Builder()
                .put("id", "com.facebook.flipper")
                .put("name", "com.facebook.flipper")
                .put("data", new FlipperObject.Builder().put("Theme", new FlipperObject.Builder()))
                .put("children", new FlipperArray.Builder().put("test"))
                .put("attributes", new FlipperArray.Builder())
                .put("decoration", (String) null)
                .put(
                    "extraInfo",
                    new FlipperObject.Builder().put("linkedNode", "com.facebook.flipper"))
                .build()));
  }

  @Test
  public void testGetNodes() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperResponderMock responder = new FlipperResponderMock();
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    root.name = "test";
    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mGetNodes.onReceive(
        new FlipperObject.Builder().put("ids", new FlipperArray.Builder().put("test")).build(),
        responder);

    assertThat(
        responder.successes,
        hasItem(
            new FlipperObject.Builder()
                .put(
                    "elements",
                    new FlipperArray.Builder()
                        .put(
                            new FlipperObject.Builder()
                                .put("id", "test")
                                .put("name", "test")
                                .put("data", new FlipperObject.Builder())
                                .put("children", new FlipperArray.Builder())
                                .put("attributes", new FlipperArray.Builder())
                                .put("decoration", (String) null)
                                .put("extraInfo", new FlipperObject.Builder())))
                .build()));
  }

  @Test
  public void testGetNodesThatDontExist() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperResponderMock responder = new FlipperResponderMock();
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mGetNodes.onReceive(
        new FlipperObject.Builder().put("ids", new FlipperArray.Builder().put("notest")).build(),
        responder);

    assertThat(
        responder.errors,
        hasItem(
            new FlipperObject.Builder()
                .put("message", "No node with given id")
                .put("id", "notest")
                .build()));
  }

  @Test
  public void testSetData() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    final FlipperResponderMock responder = new FlipperResponderMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    root.data = new FlipperObject.Builder().put("prop", "value").build();

    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mSetData.onReceive(
        new FlipperObject.Builder()
            .put("id", "test")
            .put("path", new FlipperArray.Builder().put("data"))
            .put("value", new FlipperObject.Builder().put("prop", "updated_value"))
            .build(),
        responder);

    assertThat(root.data.getString("prop"), equalTo("updated_value"));
    assertThat(
        connection.sent.get("invalidate"),
        hasItem(
            new FlipperObject.Builder()
                .put(
                    "nodes",
                    new FlipperArray.Builder()
                        .put(new FlipperObject.Builder().put("id", "test").build())
                        .build())
                .build()));
  }

  @Test
  public void testSetHighlighted() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    final FlipperResponderMock responder = new FlipperResponderMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mSetHighlighted.onReceive(
        new FlipperObject.Builder().put("id", "com.facebook.flipper").build(), responder);

    assertThat(mApplicationDescriptor.highlighted, equalTo(true));

    plugin.mSetHighlighted.onReceive(
        new FlipperObject.Builder().put("id", "test").build(), responder);

    assertThat(mApplicationDescriptor.highlighted, equalTo(false));
    assertThat(root.highlighted, equalTo(true));

    plugin.onDisconnect();

    assertThat(root.highlighted, equalTo(false));
  }

  @Test
  public void testHitTest() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperConnectionMock connection = new FlipperConnectionMock();

    final TestNode one = new TestNode();
    one.id = "1";
    one.bounds.set(5, 5, 20, 20);

    final TestNode two = new TestNode();
    two.id = "2";
    two.bounds.set(20, 20, 100, 100);

    final TestNode three = new TestNode();
    three.id = "3";
    three.bounds.set(0, 0, 20, 20);

    final TestNode root = new TestNode();
    root.id = "test";
    root.children.add(one);
    root.children.add(two);
    root.children.add(three);
    mApplicationDescriptor.root = root;

    TouchOverlayView view =
        new TouchOverlayView(mApp.getApplication(), connection, mApp) {
          @Override
          protected String trackObject(Object obj) throws Exception {
            return plugin.trackObject(obj);
          }

          @Override
          protected NodeDescriptor<Object> descriptorForObject(Object obj) {
            return plugin.descriptorForObject(obj);
          }
        };

    view.hitTest(10, 10);

    assertThat(
        connection.sent.get("select"),
        hasItem(
            new FlipperObject.Builder()
                .put(
                    "tree",
                    new FlipperObject.Builder()
                        .put(
                            "com.facebook.flipper",
                            new FlipperObject.Builder()
                                .put(
                                    "test",
                                    new FlipperObject.Builder()
                                        .put("3", new FlipperObject.Builder())
                                        .put("1", new FlipperObject.Builder()))))
                .put(
                    "path",
                    new FlipperArray.Builder().put("com.facebook.flipper").put("test").put("1"))
                .build()));
  }

  @Test
  public void testSetSearchActive() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    final FlipperResponderMock responder = new FlipperResponderMock();
    plugin.onConnect(connection);

    final ViewGroup decorView = Mockito.spy(new FrameLayout(mApp.getApplication()));
    Mockito.when(mApp.getViewRoots()).thenReturn(Arrays.<View>asList(decorView));

    plugin.mSetSearchActive.onReceive(
        new FlipperObject.Builder().put("active", true).build(), responder);

    Mockito.verify(decorView, Mockito.times(1)).addView(any(TouchOverlayView.class));

    plugin.mSetSearchActive.onReceive(
        new FlipperObject.Builder().put("active", false).build(), responder);

    Mockito.verify(decorView, Mockito.times(1)).removeView(any(TouchOverlayView.class));
  }

  @Test
  public void testNullChildThrows() throws Exception {
    final InspectorFlipperPlugin plugin =
        new InspectorFlipperPlugin(mApp, mDescriptorMapping, null);
    final FlipperResponderMock responder = new FlipperResponderMock();
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    root.name = "test";
    root.children = new ArrayList<>(1);
    root.children.add(null);
    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mGetNodes.onReceive(
        new FlipperObject.Builder().put("ids", new FlipperArray.Builder().put("test")).build(),
        responder);

    assertThat(connection.errors.size(), equalTo(1));
    assertThat(
        connection.errors,
        CoreMatchers.hasItem(
            hasThrowableWithMessage("java.lang.RuntimeException: Unexpected null value")));
  }

  private class TestNode {
    String id;
    String name;
    List<TestNode> children = new ArrayList<>();
    FlipperObject data;
    List<Named<String>> attributes = new ArrayList<>();
    String decoration;
    boolean highlighted;
    Rect bounds = new Rect();
  }

  private class TestNodeDescriptor extends NodeDescriptor<TestNode> {

    @Override
    public void init(TestNode node) {}

    @Override
    public String getId(TestNode node) {
      return node.id;
    }

    @Override
    public String getName(TestNode node) {
      return node.name;
    }

    @Override
    public int getChildCount(TestNode node) {
      return node.children.size();
    }

    @Override
    public Object getChildAt(TestNode node, int index) {
      return node.children.get(index);
    }

    @Nullable
    @Override
    public Object getAXChildAt(TestNode node, int index) throws Exception {
      return node.children.get(index);
    }

    @Override
    public List<Named<FlipperObject>> getData(TestNode node) {
      return Collections.singletonList(new Named<>("data", node.data));
    }

    @Override
    public void setValue(
        TestNode node,
        String[] path,
        @Nullable SetDataOperations.FlipperValueHint kind,
        FlipperDynamic value)
        throws Exception {
      if (path[0].equals("data")) {
        node.data = value.asObject();
      }
      invalidate(node);
    }

    @Override
    public List<Named<String>> getAttributes(TestNode node) {
      return node.attributes;
    }

    @Override
    public void setHighlighted(TestNode testNode, boolean b, boolean b1) throws Exception {
      testNode.highlighted = b;
    }

    @Override
    public void hitTest(TestNode node, Touch touch) {
      boolean finish = true;
      for (int i = node.children.size() - 1; i >= 0; i--) {
        final TestNode child = node.children.get(i);
        final Rect bounds = child.bounds;
        if (touch.containedIn(bounds.left, bounds.top, bounds.right, bounds.bottom)) {
          touch.continueWithOffset(i, bounds.left, bounds.top);
          finish = false;
        }
      }

      if (finish) touch.finish();
    }

    @Override
    public String getDecoration(TestNode node) {
      return node.decoration;
    }

    @Override
    public boolean matches(String query, TestNode node) {
      return getName(node).contains(query);
    }
  }

  private class MockApplicationDescriptor extends ApplicationDescriptor {
    TestNode root;
    boolean highlighted;

    @Override
    public int getChildCount(ApplicationWrapper node) {
      return 1;
    }

    @Override
    public Object getChildAt(ApplicationWrapper node, int index) {
      return root;
    }

    @Nullable
    @Override
    public Object getAXChildAt(ApplicationWrapper node, int index) {
      return root;
    }

    @Override
    public void setHighlighted(ApplicationWrapper node, boolean selected, boolean isAlignmentMode) {
      highlighted = selected;
    }

    @Override
    public void hitTest(ApplicationWrapper node, Touch touch) {
      touch.continueWithOffset(0, 0, 0);
    }
  }
}
