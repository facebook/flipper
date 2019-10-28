/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.litho;

import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.litho.DebugComponent;
import com.facebook.litho.LithoView;
import com.facebook.litho.sections.debug.DebugSection;
import com.facebook.litho.widget.LithoRecylerView;

public final class LithoFlipperDescriptors {

  public static void add(DescriptorMapping descriptorMapping) {
    descriptorMapping.register(LithoView.class, new LithoViewDescriptor());
    descriptorMapping.register(DebugComponent.class, new DebugComponentDescriptor());
  }

  public static void addWithSections(DescriptorMapping descriptorMapping) {
    add(descriptorMapping);
    descriptorMapping.register(LithoRecylerView.class, new LithoRecyclerViewDescriptor());
    descriptorMapping.register(DebugSection.class, new DebugSectionDescriptor());
  }
}
