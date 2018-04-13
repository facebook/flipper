/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector;

public abstract class SelfRegisteringNodeDescriptor<T> extends NodeDescriptor<T> {

  public abstract void register(DescriptorMapping descriptorMapping);
}
