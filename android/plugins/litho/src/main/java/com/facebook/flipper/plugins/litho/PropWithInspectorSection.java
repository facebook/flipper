/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.litho;

import java.util.AbstractMap;
import javax.annotation.CheckForNull;

public interface PropWithInspectorSection {
  @CheckForNull
  AbstractMap.SimpleEntry<String, String> getFlipperLayoutInspectorSection();
}
