/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.debugInspectorInfo
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Preview
@Composable
fun Counter() {
  var count: Int by remember { mutableIntStateOf(0) }

  Column(
      modifier = Modifier.fillMaxWidth(),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text(
            text = "Tap + and - to update the count",
            modifier = Modifier.myColorModifier(Color.Red).height(50.dp),
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            minLines = 1)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(30.dp)) {
              Button(onClick = { count-- }) { Text(text = "-", minLines = 1) }
              Text(text = "$count", fontSize = 24.sp, minLines = 1)
              Button(onClick = { count++ }) { Text(text = "+", minLines = 1) }
            }
      }
}

// custom modifier with inspector info
fun Modifier.myColorModifier(color: Color) =
    composed(
        inspectorInfo =
            debugInspectorInfo {
              name = "myColorModifier"
              value = color
            },
        factory = { Modifier })

class JetpackComposeActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent { Counter() }
  }
}
