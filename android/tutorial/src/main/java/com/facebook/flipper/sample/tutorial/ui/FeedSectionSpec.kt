/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.tutorial.ui

import com.facebook.flipper.sample.tutorial.MarineMammal
import com.facebook.litho.annotations.FromEvent
import com.facebook.litho.annotations.OnEvent
import com.facebook.litho.annotations.Prop
import com.facebook.litho.sections.Children
import com.facebook.litho.sections.SectionContext
import com.facebook.litho.sections.annotations.GroupSectionSpec
import com.facebook.litho.sections.annotations.OnCreateChildren
import com.facebook.litho.sections.common.DataDiffSection
import com.facebook.litho.sections.common.RenderEvent
import com.facebook.litho.widget.ComponentRenderInfo
import com.facebook.litho.widget.RenderInfo

@GroupSectionSpec
object FeedSectionSpec {
    @OnCreateChildren
    fun onCreateChildren(c: SectionContext, @Prop data: List<MarineMammal>): Children =
            Children.create()
                    .child(DataDiffSection.create<MarineMammal>(c)
                            .data(data)
                            .renderEventHandler(FeedSection.render(c)))
                    .build()

    @OnEvent(RenderEvent::class)
    fun render(
            c: SectionContext,
            @FromEvent model: MarineMammal
    ): RenderInfo =
            ComponentRenderInfo.create()
                    .component(FeedItemCard.create(c).mammal(model).build())
                    .build()
}