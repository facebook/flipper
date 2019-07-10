/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
package com.facebook.flipper.plugins.sections;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.litho.sections.ChangesInfo;
import com.facebook.litho.sections.ChangesetDebugConfiguration;
import com.facebook.litho.sections.ChangesetDebugConfiguration.ChangesetDebugListener;
import com.facebook.litho.sections.Section;
import com.facebook.litho.sections.SectionsLogEventUtils;
import com.facebook.litho.sections.SectionsLogEventUtils.ApplyNewChangeSet;
import java.util.concurrent.atomic.AtomicInteger;

public class ChangesetDebug implements ChangesetDebugListener {

  private static ChangesetListener sSectionsFlipperPlugin;
  private static ChangesetDebug sInstance;
  private static AtomicInteger sChangesetIdGenerator = new AtomicInteger();

  public interface ChangesetListener {
    void onChangesetApplied(
        String name,
        boolean isAsync,
        String surfaceId,
        String id,
        FlipperArray tree,
        FlipperObject changesetData);
  }

  public static void setListener(ChangesetListener listener) {
    if (sInstance == null) {
      sInstance = new ChangesetDebug(listener);
      ChangesetDebugConfiguration.setListener(sInstance);
    }
  }

  private ChangesetDebug(ChangesetListener listener) {
    sSectionsFlipperPlugin = listener;
  }

  @Override
  public void onChangesetApplied(
      Section rootSection,
      Section oldSection,
      ChangesInfo changesInfo,
      String surfaceId,
      @ApplyNewChangeSet int attribution,
      String extra) {
    final FlipperArray.Builder tree = new FlipperArray.Builder();
    final FlipperObject.Builder changesetData = new FlipperObject.Builder();

    final String sourceName = SectionsLogEventUtils.applyNewChangeSetSourceToString(attribution);

    sSectionsFlipperPlugin.onChangesetApplied(
        sourceName + " " + extra,
        isEventAsync(attribution),
        surfaceId,
        sChangesetIdGenerator.incrementAndGet() + "-" + surfaceId,
        tree.build(),
        changesetData.build());
  }

  private static boolean isEventAsync(@ApplyNewChangeSet int source) {
    switch (source) {
      case ApplyNewChangeSet.SET_ROOT_ASYNC:
      case ApplyNewChangeSet.UPDATE_STATE_ASYNC:
        return true;
      default:
        return false;
    }
  }
}
