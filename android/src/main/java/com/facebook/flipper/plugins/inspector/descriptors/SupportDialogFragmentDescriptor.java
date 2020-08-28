/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import android.app.Dialog;
import androidx.fragment.app.DialogFragment;
import androidx.fragment.app.Fragment;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import java.util.List;
import javax.annotation.Nullable;

public class SupportDialogFragmentDescriptor extends NodeDescriptor<DialogFragment> {

  @Override
  public void init(DialogFragment node) {}

  @Override
  public String getId(DialogFragment node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Fragment.class);
    return descriptor.getId(node);
  }

  @Override
  public String getName(DialogFragment node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Fragment.class);
    return descriptor.getName(node);
  }

  @Override
  public int getChildCount(DialogFragment node) {
    return node.getDialog() == null ? 0 : 1;
  }

  @Override
  public Object getChildAt(DialogFragment node, int index) {
    return node.getDialog();
  }

  @Override
  public List<Named<FlipperObject>> getData(DialogFragment node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Fragment.class);
    return descriptor.getData(node);
  }

  @Override
  public void setValue(
      DialogFragment node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Fragment.class);
    descriptor.setValue(node, path, kind, value);
  }

  @Override
  public List<Named<String>> getAttributes(DialogFragment node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Fragment.class);
    return descriptor.getAttributes(node);
  }

  @Override
  public FlipperObject getExtraInfo(DialogFragment node) {
    final NodeDescriptor descriptor = descriptorForClass(Fragment.class);
    return descriptor.getExtraInfo(node);
  }

  @Override
  public void setHighlighted(DialogFragment node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Dialog.class);
    if (node.getDialog() != null) {
      descriptor.setHighlighted(node.getDialog(), selected, isAlignmentMode);
    }
  }

  @Override
  public void hitTest(DialogFragment node, Touch touch) {
    touch.continueWithOffset(0, 0, 0);
  }

  @Override
  public @Nullable String getDecoration(DialogFragment obj) {
    return null;
  }

  @Override
  public boolean matches(String query, DialogFragment node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
