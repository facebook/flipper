/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.annotation.SuppressLint
import android.util.TypedValue
import android.view.Window
import com.facebook.flipper.plugins.uidebugger.model.Color
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import java.lang.reflect.Field

object WindowDescriptor : ChainedDescriptor<Window>() {

  private const val NAMESPACE = "Window"
  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)
  private var internalRStyleableClass: Class<*>? = null
  private var internalRStyleableFields: Array<Field>? = null
  private var internalRStyleableWindowField: Field? = null
  private var internalRStyleable: Any? = null

  override fun onGetName(node: Window): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: Window): List<Any> = listOf(node.decorView)

  @SuppressLint("PrivateApi")
  override fun onGetData(
      node: Window,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {
    try {
      if (internalRStyleableClass == null) {
        internalRStyleableClass = Class.forName("com.android.internal.R\$styleable")
        internalRStyleableClass?.let { clazz ->
          internalRStyleable = clazz.newInstance()
          internalRStyleableFields = clazz.declaredFields
          internalRStyleableWindowField = clazz.getDeclaredField("Window")
          internalRStyleableWindowField?.isAccessible = true
        }
      }
    } catch (e: Exception) {
      return
    }

    internalRStyleableWindowField?.let { field ->
      val windowStyleable = field[internalRStyleable] as IntArray? ?: return

      val indexToName: MutableMap<Int, String> = mutableMapOf()
      internalRStyleableFields?.forEach { f ->
        if (f.name.startsWith("Window_") && f.type == Int::class.javaPrimitiveType) {
          indexToName[f.getInt(internalRStyleable)] = f.name
        }
      }

      val props = mutableMapOf<Int, Inspectable>()

      val typedValue = TypedValue()
      for ((index, attr) in windowStyleable.withIndex()) {
        val fieldName = indexToName[index] ?: continue

        if (node.context.theme.resolveAttribute(attr, typedValue, true)) {
          // Strip 'Windows_' (length: 7) from the name.
          val name = fieldName.substring(7)

          val metadata = MetadataRegister.get(NAMESPACE, name)
          val identifier =
              metadata?.id
                  ?: MetadataRegister.registerDynamic(
                      MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, name)

          when (typedValue.type) {
            TypedValue.TYPE_STRING ->
                props[identifier] = InspectableValue.Text(typedValue.string.toString())
            TypedValue.TYPE_INT_BOOLEAN ->
                props[identifier] = InspectableValue.Boolean(typedValue.data != 0)
            TypedValue.TYPE_INT_HEX ->
                props[identifier] =
                    InspectableValue.Text("0x" + Integer.toHexString(typedValue.data))
            TypedValue.TYPE_FLOAT ->
                props[identifier] =
                    InspectableValue.Number(java.lang.Float.intBitsToFloat(typedValue.data))
            TypedValue.TYPE_REFERENCE -> {
              val resId = typedValue.data
              if (resId != 0) {
                props[identifier] =
                    InspectableValue.Text(node.context.resources.getResourceName(resId))
              }
            }
            else -> {
              if (typedValue.type >= TypedValue.TYPE_FIRST_COLOR_INT &&
                  typedValue.type <= TypedValue.TYPE_LAST_COLOR_INT) {
                try {
                  val hexColor = "#" + Integer.toHexString(typedValue.data)
                  val color = android.graphics.Color.parseColor(hexColor)
                  props[identifier] = InspectableValue.Color(Color.fromColor(color))
                } catch (e: Exception) {}
              } else if (typedValue.type >= TypedValue.TYPE_FIRST_INT &&
                  typedValue.type <= TypedValue.TYPE_LAST_INT) {
                props[identifier] = InspectableValue.Number(typedValue.data)
              }
            }
          }
        }
      }

      attributeSections[SectionId] = InspectableObject(props.toMap())
    }
  }
}
