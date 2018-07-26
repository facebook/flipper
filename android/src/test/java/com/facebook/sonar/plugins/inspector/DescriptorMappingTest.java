/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.inspector;

import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.MatcherAssert.assertThat;

import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.testing.SonarConnectionMock;
import com.facebook.testing.robolectric.v3.WithTestDefaultsRunner;
import java.util.List;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(WithTestDefaultsRunner.class)
public class DescriptorMappingTest {

  private class TestClass {}

  private class TestSubClass extends TestClass {}

  private class TestDescriptor<T> extends NodeDescriptor<T> {
    @Override
    public void init(T node) {}

    @Override
    public String getId(T node) {
      return null;
    }

    @Override
    public String getName(T node) {
      return null;
    }

    @Override
    public int getChildCount(T node) {
      return 0;
    }

    @Override
    public T getChildAt(T node, int index) {
      return null;
    }

    @Override
    public List<Named<SonarObject>> getData(T node) {
      return null;
    }

    @Override
    public void setValue(T node, String[] path, SonarDynamic value) throws Exception {}

    @Override
    public List<Named<String>> getAttributes(T node) {
      return null;
    }

    @Override
    public void setHighlighted(T node, boolean selected) {}

    @Override
    public void hitTest(T node, Touch touch) {}

    @Override
    public String getDecoration(T obj) {
      return null;
    }

    @Override
    public boolean matches(String query, T obj) {
      return false;
    }
  }

  @Test
  public void testDescriptorForRegisteredClass() {
    final DescriptorMapping descriptorMapping = new DescriptorMapping();
    final NodeDescriptor descriptor1 = new TestDescriptor<>();
    final NodeDescriptor descriptor2 = new TestDescriptor<>();

    descriptorMapping.register(TestClass.class, descriptor1);
    descriptorMapping.register(TestSubClass.class, descriptor2);

    assertThat(descriptorMapping.descriptorForClass(TestSubClass.class), equalTo(descriptor2));
  }

  @Test
  public void testDescriptorForRegisteredSuperClass() {
    final DescriptorMapping descriptorMapping = new DescriptorMapping();
    final NodeDescriptor descriptor = new TestDescriptor<>();

    descriptorMapping.register(TestClass.class, descriptor);

    assertThat(descriptorMapping.descriptorForClass(TestSubClass.class), equalTo(descriptor));
  }

  @Test
  public void testOnConnect() {
    final DescriptorMapping descriptorMapping = new DescriptorMapping();
    final NodeDescriptor descriptor = new TestDescriptor<>();
    descriptorMapping.register(TestClass.class, descriptor);

    final SonarConnection connection = new SonarConnectionMock();
    descriptorMapping.onConnect(connection);

    assertThat(descriptor.connected(), equalTo(true));
  }

  @Test
  public void testOnDisconnect() {
    final DescriptorMapping descriptorMapping = new DescriptorMapping();
    final NodeDescriptor descriptor = new TestDescriptor<>();
    descriptorMapping.register(TestClass.class, descriptor);

    final SonarConnection connection = new SonarConnectionMock();
    descriptorMapping.onConnect(connection);
    descriptorMapping.onDisconnect();

    assertThat(descriptor.connected(), equalTo(false));
  }
}
