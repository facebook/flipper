/*
 *  Copyright (c) 2004-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.sandbox;

import java.util.Map;
import javax.annotation.Nullable;

public interface SandboxFlipperPluginStrategy {

  @Nullable
  Map<String, String> getKnownSandboxes();

  void setSandbox(@Nullable String sandbox);
}
