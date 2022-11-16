/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors.props

import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.*
import com.facebook.litho.Component
import com.facebook.litho.SpecGeneratedComponent
import com.facebook.litho.annotations.Prop
import com.facebook.litho.annotations.ResType
import com.facebook.litho.editor.EditorRegistry
import com.facebook.litho.editor.model.EditorArray
import com.facebook.litho.editor.model.EditorBool
import com.facebook.litho.editor.model.EditorColor
import com.facebook.litho.editor.model.EditorNumber
import com.facebook.litho.editor.model.EditorPick
import com.facebook.litho.editor.model.EditorShape
import com.facebook.litho.editor.model.EditorString
import com.facebook.litho.editor.model.EditorValue
import com.facebook.litho.editor.model.EditorValue.EditorVisitor
import com.facebook.yoga.*

object ComponentPropExtractor {
  private const val NAMESPACE = "ComponentPropExtractor"

  fun getProps(component: Component): Map<MetadataId, Inspectable> {
    val props = mutableMapOf<MetadataId, Inspectable>()

    val isSpecComponent = component is SpecGeneratedComponent

    for (declaredField in component.javaClass.declaredFields) {
      declaredField.isAccessible = true

      val name = declaredField.name

      val metadata = MetadataRegister.get(component.simpleName, name)
      val identifier =
          metadata?.id
              ?: MetadataRegister.registerDynamic(
                  MetadataRegister.TYPE_ATTRIBUTE, component.simpleName, name)

      val declaredFieldAnnotation = declaredField.getAnnotation(Prop::class.java)

      // Only expose `@Prop` annotated fields for Spec components
      if (isSpecComponent && declaredFieldAnnotation == null) {
        continue
      }

      val prop =
          try {
            declaredField[component]
          } catch (e: IllegalAccessException) {
            continue
          }

      if (declaredFieldAnnotation != null) {
        val resType = declaredFieldAnnotation.resType
        if (resType == ResType.COLOR) {
          if (prop != null) {
            props[identifier] = InspectableValue.Color(Color.fromColor(prop as Int))
          }
          continue
        } else if (resType == ResType.DRAWABLE) {
          props[identifier] = fromDrawable(prop as Drawable?)
          continue
        }
      }

      val editorValue: EditorValue? =
          EditorRegistry.read(declaredField.type, declaredField, component)

      if (editorValue != null) {
        props[identifier] = toInspectable(name, editorValue)
      }
    }

    return props
  }

  private fun fromDrawable(d: Drawable?): Inspectable =
      when (d) {
        is ColorDrawable -> InspectableValue.Color(Color.fromColor(d.color))
        else -> InspectableValue.Unknown(d.toString())
      }

  private fun toInspectable(name: String, editorValue: EditorValue): Inspectable {
    return editorValue.`when`(
        object : EditorVisitor<Inspectable> {
          override fun isShape(shape: EditorShape): Inspectable {

            val fields = mutableMapOf<MetadataId, Inspectable>()
            shape.value.entries.forEach { entry ->
              val metadata = MetadataRegister.get(name, entry.key)
              val identifier =
                  metadata?.id
                      ?: MetadataRegister.registerDynamic(
                          MetadataRegister.TYPE_LAYOUT, name, entry.key)

              val value = toInspectable(entry.key, entry.value)
              fields[identifier] = value
            }

            return InspectableObject(fields)
          }

          override fun isArray(array: EditorArray?): Inspectable {
            val values = array?.value?.map { value -> toInspectable(name, value) }
            return InspectableArray(0, values ?: listOf())
          }

          override fun isPick(pick: EditorPick?): Inspectable =
              InspectableValue.Enum(Enumeration(pick?.values ?: setOf(), pick?.selected))

          override fun isNumber(number: EditorNumber): Inspectable =
              InspectableValue.Number(number.value)

          override fun isColor(number: EditorColor): Inspectable =
              InspectableValue.Color(number.value.toInt().let { Color.fromColor(it) })

          override fun isString(string: EditorString?): Inspectable =
              InspectableValue.Text(string?.value ?: "")

          override fun isBool(bool: EditorBool): Inspectable = InspectableValue.Boolean(bool.value)
        })
  }
}
