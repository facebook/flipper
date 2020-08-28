/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import static com.facebook.flipper.plugins.inspector.InspectorValue.Type.Color;
import static com.facebook.flipper.plugins.inspector.InspectorValue.Type.Number;
import static com.facebook.flipper.plugins.inspector.InspectorValue.Type.Text;

import android.view.View;
import android.widget.TextView;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.InspectorValue;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
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
  public String getAXName(TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getAXName(node);
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
  public @Nullable Object getAXChildAt(TextView node, int index) {
    return null;
  }

  @Override
  public List<Named<FlipperObject>> getData(TextView node) throws Exception {
    final List<Named<FlipperObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(View.class);

    props.add(
        0,
        new Named<>(
            "TextView",
            new FlipperObject.Builder()
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
  public List<Named<FlipperObject>> getAXData(TextView node) throws Exception {
    final List<Named<FlipperObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    props.addAll(descriptor.getAXData(node));
    return props;
  }

  @Override
  public void setValue(
      TextView node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value)
      throws Exception {
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
        descriptor.setValue(node, path, kind, value);
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
  public List<Named<String>> getAXAttributes(TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getAXAttributes(node);
  }

  @Override
  public FlipperObject getExtraInfo(TextView node) {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getExtraInfo(node);
  }

  @Override
  public void setHighlighted(TextView node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.setHighlighted(node, selected, isAlignmentMode);
  }

  @Override
  public void hitTest(TextView node, Touch touch) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.hitTest(node, touch);
  }

  @Override
  public void axHitTest(TextView node, Touch touch) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.axHitTest(node, touch);
  }

  @Override
  public @Nullable String getDecoration(TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getDecoration(node);
  }

  @Override
  public @Nullable String getAXDecoration(TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getAXDecoration(node);
  }

  @Override
  public boolean matches(String query, TextView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
