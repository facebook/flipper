/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.tutorial.ui

import com.facebook.flipper.sample.tutorial.MarineMammals
import com.facebook.litho.Component
import com.facebook.litho.ComponentContext
import com.facebook.litho.annotations.LayoutSpec
import com.facebook.litho.annotations.OnCreateLayout
import com.facebook.litho.sections.SectionContext
import com.facebook.litho.sections.widget.RecyclerCollectionComponent
import com.facebook.yoga.YogaEdge

@LayoutSpec
object RootComponentSpec {
    @OnCreateLayout
    fun onCreateLayout(c: ComponentContext): Component =
            RecyclerCollectionComponent.create(c)
                    .disablePTR(true)
                    .section(FeedSection.create(SectionContext(c)).data(MarineMammals.list).build())
                    .paddingDip(YogaEdge.TOP, 8f)
                    .build()
}