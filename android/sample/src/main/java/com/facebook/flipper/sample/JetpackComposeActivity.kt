package com.facebook.flipper.sample

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@Composable
fun MessageCard(name: String) {
  Row(modifier = Modifier.padding(all = 8.dp)) { Text(text = "Hello $name!") }
}

@Preview
@Composable
fun PreviewMessageCard() {
  MessageCard("Android")
}

class JetpackComposeActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent { MessageCard("Flipper") }
  }
}
