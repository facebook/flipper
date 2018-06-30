/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector;

import android.support.annotation.Nullable;
import com.facebook.sonar.core.SonarArray;
import com.facebook.sonar.core.SonarObject;
import java.util.List;

public class SearchResultNode {

  private final String id;
  private final boolean isMatch;
  private final SonarObject element;
  @Nullable
  private final List<SearchResultNode> children;

  SearchResultNode(
      String id, boolean isMatch, SonarObject element, @Nullable List<SearchResultNode> children) {
    this.id = id;
    this.isMatch = isMatch;
    this.element = element;
    this.children = children;
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
        .put("element", this.element)
        .put("children", childArray)
        .build();
  }
}
