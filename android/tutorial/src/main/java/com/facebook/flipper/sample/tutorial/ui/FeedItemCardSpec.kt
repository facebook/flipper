/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.tutorial.ui

import com.facebook.flipper.sample.tutorial.MarineMammal
import com.facebook.litho.Column
import com.facebook.litho.Component
import com.facebook.litho.ComponentContext
import com.facebook.litho.annotations.LayoutSpec
import com.facebook.litho.annotations.OnCreateLayout
import com.facebook.litho.annotations.Prop
import com.facebook.litho.widget.Card

import com.facebook.yoga.YogaEdge.HORIZONTAL
import com.facebook.yoga.YogaEdge.VERTICAL

@LayoutSpec
object FeedItemCardSpec {

  @OnCreateLayout
  fun onCreateLayout(
      c: ComponentContext,
      @Prop mammal: MarineMammal
  ): Component =
      Column.create(c)
          .paddingDip(VERTICAL, 8f)
          .paddingDip(HORIZONTAL, 16f)
          .child(
              Card.create(c)
                  .content(
                      MarineMammelComponent.create(c)
                          .mammal(mammal)))
          .build()
}