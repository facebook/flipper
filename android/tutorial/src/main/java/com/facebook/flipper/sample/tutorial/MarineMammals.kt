/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.tutorial

import androidx.core.net.toUri

object MarineMammals {
    val list = listOf(
            MarineMammal(
                    "Polar Bear",
                    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ursus_maritimus_4_1996-08-04.jpg/190px-Ursus_maritimus_4_1996-08-04.jpg".toUri()),
            MarineMammal(
                    "Sea Otter",
                    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Sea_otter_cropped.jpg/220px-Sea_otter_cropped.jpg".toUri()),
            MarineMammal(
                    "West Indian Manatee",
                    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/FL_fig04.jpg/230px-FL_fig04.jpg".toUri()),
            MarineMammal(
                    "Bottlenose Dolphin",
                    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tursiops_truncatus_01.jpg/220px-Tursiops_truncatus_01.jpg".toUri())
    )
}