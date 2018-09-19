/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.flipper.plugins.inspector;

import android.support.annotation.Nullable;
import com.facebook.flipper.core.SonarArray;
import com.facebook.flipper.core.SonarObject;
import java.util.List;

public class SearchResultNode {

  private final String id;
  private final boolean isMatch;
  private final SonarObject element;
  private final SonarObject axElement;
  @Nullable
  private final List<SearchResultNode> children;

  SearchResultNode(
      String id, boolean isMatch, SonarObject element, List<SearchResultNode> children, SonarObject axElement) {
    this.id = id;
    this.isMatch = isMatch;
    this.element = element;
    this.children = children;
    this.axElement = axElement;
  }

  SonarObject toSonarObject() {
    final SonarArray childArray;
    if (children != null) {
      final SonarArray.Builder builder = new SonarArray.Builder();
      for (SearchResultNode child : children) {
        builder.put(child.toSonarObject());
      }
      childArray = builder.build();
    } else {
      childArray = null;
    }

    return new SonarObject.Builder()
        .put("id", this.id)
        .put("isMatch", this.isMatch)
        .put("axElement", this.axElement)
        .put("element", this.element)
        .put("children", childArray)
        .build();
  }
}
