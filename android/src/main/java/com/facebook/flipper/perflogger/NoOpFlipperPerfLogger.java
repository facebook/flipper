/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.perflogger;

public class NoOpFlipperPerfLogger implements FlipperPerfLogger {

  @Override
  public void startMarker(String name) {}

  @Override
  public void endMarker(String name) {}

  @Override
  public void cancelMarker(String name) {}
}
