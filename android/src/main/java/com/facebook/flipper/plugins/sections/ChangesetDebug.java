/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
package com.facebook.flipper.plugins.sections;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.litho.sections.Change;
import com.facebook.litho.sections.ChangesInfo;
import com.facebook.litho.sections.ChangesetDebugConfiguration;
import com.facebook.litho.sections.ChangesetDebugConfiguration.ChangesetDebugListener;
import com.facebook.litho.sections.Section;
import com.facebook.litho.sections.SectionsLogEventUtils;
import com.facebook.litho.sections.SectionsLogEventUtils.ApplyNewChangeSet;
import java.util.ArrayList;
import java.util.List;
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
    extractSidePanelChangesetData(changesInfo, changesetData, rootSection.getGlobalKey());

    createSectionTree(rootSection, "", tree, oldSection);

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

  /** Extract the changesets for this section tree. */
  private static void extractSidePanelChangesetData(
      ChangesInfo changesInfo, FlipperObject.Builder changesetData, String globalKey) {
    final FlipperObject.Builder sectionChangesetInfo = new FlipperObject.Builder();

    final List<Change> changeList = changesInfo.getAllChanges();

    final FlipperObject.Builder changesets = new FlipperObject.Builder();
    for (int i = 0; i < changeList.size(); i++) {
      final Change change = changeList.get(i);
      final FlipperObject.Builder changeData = new FlipperObject.Builder();
      changeData.put("type", Change.changeTypeToString(change.getType()));
      changeData.put("index", change.getIndex());
      if (change.getToIndex() >= 0) {
        changeData.put("toIndex", change.getToIndex());
      }

      changeData.put("count", change.getCount());

      changeData.put("render_infos", ChangesetDebugConfiguration.getRenderInfoNames(change));

      changeData.put("prev_data", getDataNamesFromChange(change.getPrevData()));

      changeData.put("next_data", getDataNamesFromChange(change.getNextData()));

      changesets.put(i + "", changeData.build());
    }
    sectionChangesetInfo.put("changesets", changesets.build());

    changesetData.put(globalKey, sectionChangesetInfo.build());
  }

  private static List<String> getDataNamesFromChange(List<?> data) {
    final List<String> names = new ArrayList<>();

    if (data == null) {
      return names;
    }

    for (int i = 0; i < data.size(); i++) {
      names.add(data.get(i).toString());
    }

    return names;
  }

  /** Finds the section with the same global key in the previous tree, if it existed. */
  private static Section findSectionInPreviousTree(Section previousRoot, String globalKey) {
    if (previousRoot == null) {
      return null;
    }

    if (previousRoot.getGlobalKey().equals(globalKey)) {
      return previousRoot;
    }

    if (previousRoot.getChildren() == null) {
      return null;
    }

    int count = previousRoot.getChildren().size();
    for (int i = 0; i < count; i++) {
      Section child = previousRoot.getChildren().get(i);
      final Section previousSection = findSectionInPreviousTree(child, globalKey);

      if (previousSection != null) {
        return previousSection;
      }
    }

    return null;
  }

  static void createSectionTree(
      Section rootSection, String parentKey, FlipperArray.Builder tree, Section oldRootSection) {
    if (rootSection == null) {
      return;
    }

    final String globalKey = rootSection.getGlobalKey();
    final FlipperObject.Builder nodeBuilder = new FlipperObject.Builder();

    final Section oldSection = findSectionInPreviousTree(oldRootSection, globalKey);
    final boolean isDirty = ChangesetDebugConfiguration.isSectionDirty(oldSection, rootSection);

    nodeBuilder.put("identifier", globalKey);
    nodeBuilder.put("name", rootSection.getSimpleName());
    nodeBuilder.put("parent", parentKey);
    nodeBuilder.put("isDirty", isDirty);
    nodeBuilder.put("isReused", !isDirty);
    nodeBuilder.put("didTriggerStateUpdate", false); // TODO
    tree.put(nodeBuilder.build());

    if (rootSection.getChildren() == null) {
      return;
    }

    for (int i = 0; i < rootSection.getChildren().size(); i++) {
      createSectionTree(rootSection.getChildren().get(i), globalKey, tree, oldRootSection);
    }
  }
}
