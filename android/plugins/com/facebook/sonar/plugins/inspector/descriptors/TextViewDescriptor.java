/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors;

import static com.facebook.sonar.plugins.inspector.InspectorValue.Type.Color;
import static com.facebook.sonar.plugins.inspector.InspectorValue.Type.Number;
import static com.facebook.sonar.plugins.inspector.InspectorValue.Type.Text;

import android.view.View;
import android.widget.TextView;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.plugins.inspector.InspectorValue;
import com.facebook.sonar.plugins.inspector.Named;
import com.facebook.sonar.plugins.inspector.NodeDescriptor;
import com.facebook.sonar.plugins.inspector.Touch;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;

public class TextViewDescriptor extends NodeDescriptor<TextView> {

  @Override
  public void init(TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.init(node);
  }

  @Override
  public String getId(TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getId(node);
  }

  @Override
  public String getName(TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getName(node);
  }

  @Override
  public int getChildCount(TextView node) {
    return 0;
  }

  @Override
  public @Nullable Object getChildAt(TextView node, int index) {
    return null;
  }

  @Override
  public List<Named<SonarObject>> getData(TextView node) throws Exception {
    final List<Named<SonarObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(View.class);

    props.add(
        0,
        new Named<>(
            "TextView",
            new SonarObject.Builder()
                .put("text", InspectorValue.mutable(Text, node.getText().toString()))
                .put(
                    "textColor",
                    InspectorValue.mutable(Color, node.getTextColors().getDefaultColor()))
                .put("textSize", InspectorValue.mutable(Number, node.getTextSize()))
                .build()));

    props.addAll(descriptor.getData(node));

    return props;
  }

  @Override
  public void setValue(TextView node, String[] path, SonarDynamic value) throws Exception {
    switch (path[0]) {
      case "TextView":
        switch (path[1]) {
          case "text":
            node.setText(value.asString());
            break;
          case "textColor":
            node.setTextColor(value.asInt());
            break;
          case "textSize":
            node.setTextSize(value.asInt());
            break;
        }
        break;
      default:
        final NodeDescriptor descriptor = descriptorForClass(View.class);
        descriptor.setValue(node, path, value);
        break;
    }
    invalidate(node);
  }

  @Override
  public List<Named<String>> getAttributes(TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getAttributes(node);
  }

  @Override
  public void setHighlighted(TextView node, boolean selected) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.setHighlighted(node, selected);
  }

  @Override
  public void hitTest(TextView node, Touch touch) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.hitTest(node, touch);
  }

  @Override
  public @Nullable String getDecoration(TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getDecoration(node);
  }

  @Override
  public boolean matches(String query, TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
