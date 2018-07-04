/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.inspector;

import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.hasItem;
import static org.hamcrest.MatcherAssert.assertThat;

import android.app.Application;
import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.facebook.sonar.core.SonarArray;
import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.plugins.console.iface.NullScriptingEnvironment;
import com.facebook.sonar.plugins.console.iface.ScriptingEnvironment;
import com.facebook.sonar.plugins.inspector.InspectorSonarPlugin.TouchOverlayView;
import com.facebook.sonar.plugins.inspector.descriptors.ApplicationDescriptor;
import com.facebook.sonar.testing.SonarConnectionMock;
import com.facebook.sonar.testing.SonarResponderMock;
import com.facebook.testing.robolectric.v3.WithTestDefaultsRunner;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.robolectric.RuntimeEnvironment;

@RunWith(WithTestDefaultsRunner.class)
public class InspectorSonarPluginTest {

  private MockApplicationDescriptor mApplicationDescriptor;
  private DescriptorMapping mDescriptorMapping;
  private ApplicationWrapper mApp;
  private ScriptingEnvironment mScriptingEnvironment;

  @Before
  public void setup() {
    final Application app = Mockito.spy(RuntimeEnvironment.application);
    Mockito.when(app.getApplicationContext()).thenReturn(app);
    Mockito.when(app.getPackageName()).thenReturn("com.facebook.sonar");

    mDescriptorMapping = new DescriptorMapping();
    mApplicationDescriptor = new MockApplicationDescriptor();
    mDescriptorMapping.register(ApplicationWrapper.class, mApplicationDescriptor);
    mDescriptorMapping.register(TestNode.class, new TestNodeDescriptor());
    mScriptingEnvironment = new NullScriptingEnvironment();
    mApp = Mockito.spy(new ApplicationWrapper(app));
  }

  @Test
  public void testOnConnect() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarConnection connection = new SonarConnectionMock();

    plugin.onConnect(connection);
    assertThat(mApplicationDescriptor.connected(), equalTo(true));
  }

  @Test
  public void testOnDisconnect() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarConnection connection = new SonarConnectionMock();

    plugin.onConnect(connection);
    plugin.onDisconnect();
    assertThat(mApplicationDescriptor.connected(), equalTo(false));
  }

  @Test
  public void testGetRoot() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarResponderMock responder = new SonarResponderMock();
    final SonarConnectionMock connection = new SonarConnectionMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    mApplicationDescriptor.root = root;
    plugin.mGetRoot.onReceive(null, responder);

    assertThat(
        responder.successes,
        hasItem(
            new SonarObject.Builder()
                .put("id", "com.facebook.sonar")
                .put("name", "com.facebook.sonar")
                .put("data", new SonarObject.Builder())
                .put("children", new SonarArray.Builder().put("test"))
                .put("attributes", new SonarArray.Builder())
                .put("decoration", (String) null)
                .build()));
  }

  @Test
  public void testGetNodes() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarResponderMock responder = new SonarResponderMock();
    final SonarConnectionMock connection = new SonarConnectionMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    root.name = "test";
    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mGetNodes.onReceive(
        new SonarObject.Builder().put("ids", new SonarArray.Builder().put("test")).build(),
        responder);

    assertThat(
        responder.successes,
        hasItem(
            new SonarObject.Builder()
                .put(
                    "elements",
                    new SonarArray.Builder()
                        .put(
                            new SonarObject.Builder()
                                .put("id", "test")
                                .put("name", "test")
                                .put("data", new SonarObject.Builder())
                                .put("children", new SonarArray.Builder())
                                .put("attributes", new SonarArray.Builder())
                                .put("decoration", (String) null)))
                .build()));
  }

  @Test
  public void testGetNodesThatDontExist() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarResponderMock responder = new SonarResponderMock();
    final SonarConnectionMock connection = new SonarConnectionMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mGetNodes.onReceive(
        new SonarObject.Builder().put("ids", new SonarArray.Builder().put("notest")).build(),
        responder);

    assertThat(
        responder.errors,
        hasItem(
            new SonarObject.Builder()
                .put("message", "No node with given id")
                .put("id", "notest")
                .build()));
  }

  @Test
  public void testSetData() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarConnectionMock connection = new SonarConnectionMock();
    final SonarResponderMock responder = new SonarResponderMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    root.data = new SonarObject.Builder().put("prop", "value").build();

    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mSetData.onReceive(
        new SonarObject.Builder()
            .put("id", "test")
            .put("path", new SonarArray.Builder().put("data"))
            .put("value", new SonarObject.Builder().put("prop", "updated_value"))
            .build(),
        responder);

    assertThat(root.data.getString("prop"), equalTo("updated_value"));
    assertThat(
        connection.sent.get("invalidate"),
        hasItem(
            new SonarObject.Builder()
                .put(
                    "nodes",
                    new SonarArray.Builder()
                        .put(new SonarObject.Builder().put("id", "test").build())
                        .build())
                .build()));
  }

  @Test
  public void testSetHighlighted() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarConnectionMock connection = new SonarConnectionMock();
    final SonarResponderMock responder = new SonarResponderMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mSetHighlighted.onReceive(
        new SonarObject.Builder().put("id", "com.facebook.sonar").build(), responder);

    assertThat(mApplicationDescriptor.highlighted, equalTo(true));

    plugin.mSetHighlighted.onReceive(
        new SonarObject.Builder().put("id", "test").build(), responder);

    assertThat(mApplicationDescriptor.highlighted, equalTo(false));
    assertThat(root.highlighted, equalTo(true));

    plugin.onDisconnect();

    assertThat(root.highlighted, equalTo(false));
  }

  @Test
  public void testHitTest() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarConnectionMock connection = new SonarConnectionMock();
    plugin.onConnect(connection);

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

    plugin.hitTest(10, 10);

    assertThat(
        connection.sent.get("select"),
        hasItem(
            new SonarObject.Builder()
                .put(
                    "path", new SonarArray.Builder().put("com.facebook.sonar").put("test").put("3"))
                .build()));
  }

  @Test
  public void testSetSearchActive() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarConnectionMock connection = new SonarConnectionMock();
    final SonarResponderMock responder = new SonarResponderMock();
    plugin.onConnect(connection);

    final ViewGroup decorView = Mockito.spy(new FrameLayout(mApp.getApplication()));
    Mockito.when(mApp.getViewRoots()).thenReturn(Arrays.<View>asList(decorView));

    plugin.mSetSearchActive.onReceive(
        new SonarObject.Builder().put("active", true).build(), responder);

    Mockito.verify(decorView, Mockito.times(1)).addView(Mockito.any(TouchOverlayView.class));

    plugin.mSetSearchActive.onReceive(
        new SonarObject.Builder().put("active", false).build(), responder);

    Mockito.verify(decorView, Mockito.times(1)).removeView(Mockito.any(TouchOverlayView.class));
  }

  @Test(expected = AssertionError.class)
  public void testNullChildThrows() throws Exception {
    final InspectorSonarPlugin plugin =
        new InspectorSonarPlugin(mApp, mDescriptorMapping, mScriptingEnvironment, null);
    final SonarResponderMock responder = new SonarResponderMock();
    final SonarConnectionMock connection = new SonarConnectionMock();
    plugin.onConnect(connection);

    final TestNode root = new TestNode();
    root.id = "test";
    root.name = "test";
    root.children = new ArrayList<>();
    root.children.add(null);
    mApplicationDescriptor.root = root;

    plugin.mGetRoot.onReceive(null, responder);
    plugin.mGetNodes.onReceive(
        new SonarObject.Builder().put("ids", new SonarArray.Builder().put("test")).build(),
        responder);
  }

  private class TestNode {
    String id;
    String name;
    List<TestNode> children = new ArrayList<>();
    SonarObject data;
    List<Named<String>> atttributes = new ArrayList<>();
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

    @Override
    public List<Named<SonarObject>> getData(TestNode node) {
      return Collections.singletonList(new Named<>("data", node.data));
    }

    @Override
    public void setValue(TestNode node, String[] path, SonarDynamic value) throws Exception {
      if (path[0].equals("data")) {
        node.data = value.asObject();
      }
      invalidate(node);
    }

    @Override
    public List<Named<String>> getAttributes(TestNode node) {
      return node.atttributes;
    }

    @Override
    public void setHighlighted(TestNode node, boolean selected) {
      node.highlighted = selected;
    }

    @Override
    public void hitTest(TestNode node, Touch touch) {
      for (int i = node.children.size() - 1; i >= 0; i--) {
        final TestNode child = node.children.get(i);
        final Rect bounds = child.bounds;
        if (touch.containedIn(bounds.left, bounds.top, bounds.right, bounds.bottom)) {
          touch.continueWithOffset(i, bounds.left, bounds.top);
          return;
        }
      }

      touch.finish();
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

    @Override
    public void setHighlighted(ApplicationWrapper node, boolean selected) {
      highlighted = selected;
    }

    @Override
    public void hitTest(ApplicationWrapper node, Touch touch) {
      touch.continueWithOffset(0, 0, 0);
    }
  }
}
