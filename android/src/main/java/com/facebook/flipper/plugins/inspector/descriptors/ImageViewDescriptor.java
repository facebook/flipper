/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import android.view.View;
import android.widget.ImageView;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import com.facebook.flipper.plugins.inspector.descriptors.utils.EnumMapping;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;

public class ImageViewDescriptor extends NodeDescriptor<ImageView> {

  private static final EnumMapping<ImageView.ScaleType> sScaleTypeMapping =
      new EnumMapping<ImageView.ScaleType>("CENTER") {
        {
          put("CENTER", ImageView.ScaleType.CENTER);
          put("CENTER_CROP", ImageView.ScaleType.CENTER_CROP);
          put("CENTER_INSIDE", ImageView.ScaleType.CENTER_INSIDE);
          put("FIT_CENTER", ImageView.ScaleType.FIT_CENTER);
          put("FIT_END", ImageView.ScaleType.FIT_END);
          put("FIT_START", ImageView.ScaleType.FIT_START);
          put("FIT_XY", ImageView.ScaleType.FIT_XY);
          put("MATRIX", ImageView.ScaleType.MATRIX);
        }
      };

  @Override
  public void init(ImageView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.init(node);
  }

  @Override
  public String getId(ImageView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getId(node);
  }

  @Override
  public String getName(ImageView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getName(node);
  }

  @Override
  public String getAXName(ImageView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getAXName(node);
  }

  @Override
  public int getChildCount(ImageView node) {
    return 0;
  }

  @Override
  public @Nullable Object getChildAt(ImageView node, int index) {
    return null;
  }

  @Override
  public @Nullable Object getAXChildAt(ImageView node, int index) {
    return null;
  }

  @Override
  public List<Named<FlipperObject>> getData(ImageView node) throws Exception {
    final List<Named<FlipperObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(View.class);

    props.add(
        0,
        new Named<>(
            "ImageView",
            new FlipperObject.Builder()
                .put("scaleType", sScaleTypeMapping.toPicker(node.getScaleType()))
                .build()));

    props.addAll(descriptor.getData(node));

    return props;
  }

  @Override
  public List<Named<FlipperObject>> getAXData(ImageView node) throws Exception {
    final List<Named<FlipperObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    props.addAll(descriptor.getAXData(node));
    return props;
  }

  @Override
  public void setValue(
      ImageView node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value)
      throws Exception {
    switch (path[0]) {
      case "ImageView":
        switch (path[1]) {
          case "scaleType":
            node.setScaleType(sScaleTypeMapping.get(value.asString()));
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
  public List<Named<String>> getAttributes(ImageView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getAttributes(node);
  }

  @Override
  public List<Named<String>> getAXAttributes(ImageView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getAXAttributes(node);
  }

  @Override
  public FlipperObject getExtraInfo(ImageView node) {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getExtraInfo(node);
  }

  @Override
  public void setHighlighted(ImageView node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.setHighlighted(node, selected, isAlignmentMode);
  }

  @Override
  public void hitTest(ImageView node, Touch touch) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.hitTest(node, touch);
  }

  @Override
  public void axHitTest(ImageView node, Touch touch) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.axHitTest(node, touch);
  }

  @Override
  public @Nullable String getDecoration(ImageView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getDecoration(node);
  }

  @Override
  public @Nullable String getAXDecoration(ImageView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getAXDecoration(node);
  }

  @Override
  public boolean matches(String query, ImageView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
