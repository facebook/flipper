/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.Transient

@Serializable
data class CustomActionGroup(
    val title: String,
    val actionIcon: ActionIcon,
    val actions: List<Action>
)

sealed interface Action {
  @Serializable
  @SerialName("UnitAction")
  data class UnitAction(val title: String, @Transient val action: () -> Unit = {}) : Action

  @Serializable
  @SerialName("BooleanAction")
  data class BooleanAction(
      val title: String,
      val initialValue: Boolean,
      @Transient val action: (Boolean) -> Boolean = { it },
  ) : Action
}

sealed interface ActionIcon {
  @Serializable
  @SerialName("Local")
  data class Local(@SerialName("iconPath") val iconFullPath: String) : ActionIcon

  @Serializable @SerialName("Antd") data class Antd(val iconName: String) : ActionIcon

  @Serializable @SerialName("Fb") data class Fb(val iconName: String) : ActionIcon
}

class CustomActionsScope {
  val actions: List<Action>
    get() = _actions

  private val _actions = mutableListOf<Action>()

  fun unitAction(title: String, action: () -> Unit) {
    _actions.add(Action.UnitAction(title, action))
  }

  fun booleanAction(title: String, initialValue: Boolean, action: (Boolean) -> Boolean) {
    _actions.add(Action.BooleanAction(title, initialValue, action))
  }
}
