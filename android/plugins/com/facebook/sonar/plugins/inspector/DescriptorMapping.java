/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector;

import android.app.Activity;
import android.app.Dialog;
import android.graphics.drawable.Drawable;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.TextView;
import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.plugins.inspector.descriptors.ActivityDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.ApplicationDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.DialogDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.DialogFragmentDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.DrawableDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.FragmentDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.ObjectDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.SupportDialogFragmentDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.SupportFragmentDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.TextViewDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.ViewDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.ViewGroupDescriptor;
import com.facebook.sonar.plugins.inspector.descriptors.WindowDescriptor;
import java.util.HashMap;
import java.util.Map;

/**
 * A mapping from classes to the object use to describe instances of a class. When looking for a
 * descriptor to describe an object this classs will traverse the object's class hierarchy until it
 * finds a matching descriptor instance.
 */
public class DescriptorMapping {
  private Map<Class<?>, NodeDescriptor<?>> mMapping = new HashMap<>();

  /**
   * @return A DescriptorMapping initialized with default descriptors for java and Android classes.
   */
  public static DescriptorMapping withDefaults() {
    final DescriptorMapping mapping = new DescriptorMapping();
    mapping.register(Object.class, new ObjectDescriptor());
    mapping.register(ApplicationWrapper.class, new ApplicationDescriptor());
    mapping.register(Activity.class, new ActivityDescriptor());
    mapping.register(Window.class, new WindowDescriptor());
    mapping.register(ViewGroup.class, new ViewGroupDescriptor());
    mapping.register(View.class, new ViewDescriptor());
    mapping.register(TextView.class, new TextViewDescriptor());
    mapping.register(Drawable.class, new DrawableDescriptor());
    mapping.register(Dialog.class, new DialogDescriptor());
    mapping.register(android.app.Fragment.class, new FragmentDescriptor());
    mapping.register(android.support.v4.app.Fragment.class, new SupportFragmentDescriptor());
    mapping.register(android.app.DialogFragment.class, new DialogFragmentDescriptor());
    mapping.register(
        android.support.v4.app.DialogFragment.class, new SupportDialogFragmentDescriptor());
    return mapping;
  }

  /** Register a descriptor for a given class. */
  public <T> void register(Class<T> clazz, NodeDescriptor<T> descriptor) {
    mMapping.put(clazz, descriptor);
  }

  NodeDescriptor<?> descriptorForClass(Class<?> clazz) {
    while (!mMapping.containsKey(clazz)) {
      clazz = clazz.getSuperclass();
    }
    return mMapping.get(clazz);
  }

  void onConnect(SonarConnection connection) {
    for (NodeDescriptor descriptor : mMapping.values()) {
      descriptor.setConnection(connection);
      descriptor.setDescriptorMapping(this);
    }
  }

  void onDisconnect() {
    for (NodeDescriptor descriptor : mMapping.values()) {
      descriptor.setConnection(null);
    }
  }
}
