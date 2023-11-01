/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors.props

import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.*
import com.facebook.litho.Component
import com.facebook.litho.SpecGeneratedComponent
import com.facebook.litho.StateContainer
import com.facebook.litho.annotations.Prop
import com.facebook.litho.annotations.ResType
import com.facebook.litho.annotations.State
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

object ComponentDataExtractor {

  fun getProps(component: Component): Map<MetadataId, Inspectable> {
    val props = mutableMapOf<MetadataId, Inspectable>()

    val isSpecComponent = component is SpecGeneratedComponent

    for (declaredField in component.javaClass.declaredFields) {
      declaredField.isAccessible = true

      val name = declaredField.name
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
            val identifier = getMetadataId(component.simpleName, name)
            props[identifier] = InspectableValue.Color(Color.fromColor(prop as Int))
          }
          continue
        } else if (resType == ResType.DRAWABLE) {
          val identifier = getMetadataId(component.simpleName, name)
          props[identifier] = fromDrawable(prop as Drawable?)
          continue
        }
      }

      val editorValue =
          try {
            EditorRegistry.read(declaredField.type, declaredField, component)
          } catch (e: Exception) {
            Log.d(
                LogTag,
                "Unable to retrieve prop ${declaredField.name} on type ${component.simpleName}")
            EditorString("error fetching prop")
          }

      if (editorValue != null) {
        addProp(props, component.simpleName, name, editorValue)
      }
    }

    return props
  }

  fun getState(stateContainer: StateContainer, componentName: String): InspectableObject {

    val stateFields = mutableMapOf<MetadataId, Inspectable>()
    for (field in stateContainer.javaClass.declaredFields) {
      field.isAccessible = true
      val stateAnnotation = field.getAnnotation(State::class.java)
      val isKStateField = field.name == "states"
      if (stateAnnotation != null || isKStateField) {
        val id = getMetadataId(componentName, field.name)
        val editorValue: EditorValue? = EditorRegistry.read(field.type, field, stateContainer)
        if (editorValue != null) {

          val inspectable = toInspectable(field.name, editorValue)

          if (inspectable is InspectableArray) {
            inspectable.items.forEachIndexed { idx, item ->
              val metadataId =
                  MetadataRegister.register(
                      MetadataRegister.TYPE_ATTRIBUTE, "kstate", idx.toString())
              stateFields[metadataId] = item
            }
          } else {
            stateFields[id] = toInspectable(field.name, editorValue)
          }
        }
      }
    }
    return InspectableObject(stateFields)
  }

  private fun getMetadataId(
      namespace: String,
      key: String,
      mutable: Boolean = false,
      possibleValues: Set<InspectableValue>? = emptySet()
  ): MetadataId {
    val metadata = MetadataRegister.get(namespace, key)
    val identifier =
        metadata?.id
            ?: MetadataRegister.register(
                MetadataRegister.TYPE_ATTRIBUTE, namespace, key, mutable, possibleValues)
    return identifier
  }

  private fun addProp(
      props: MutableMap<MetadataId, Inspectable>,
      namespace: String,
      name: String,
      value: EditorValue
  ) {
    var possibleValues: MutableSet<InspectableValue>? = null
    if (value is EditorPick) {
      possibleValues = mutableSetOf()
      value.values.forEach { possibleValues.add(InspectableValue.Text(it)) }
    }

    val identifier = getMetadataId(namespace, name, false, possibleValues)
    props[identifier] = toInspectable(name, value)
  }

  private fun toInspectable(name: String, editorValue: EditorValue): Inspectable {
    return editorValue.`when`(
        object : EditorVisitor<Inspectable> {
          override fun isShape(shape: EditorShape): Inspectable {

            val fields = mutableMapOf<MetadataId, Inspectable>()
            shape.value.entries.forEach { entry ->
              val value = toInspectable(entry.key, entry.value)

              val shapeEditorValue = entry.value
              var possibleValues: MutableSet<InspectableValue>? = null
              if (shapeEditorValue is EditorPick) {
                possibleValues = mutableSetOf()
                shapeEditorValue.values.forEach { possibleValues.add(InspectableValue.Text(it)) }
              }

              val identifier = getMetadataId(name, entry.key, false, possibleValues)
              fields[identifier] = value
            }

            return InspectableObject(fields)
          }

          override fun isArray(array: EditorArray?): Inspectable {
            val values = array?.value?.map { value -> toInspectable(name, value) }
            return InspectableArray(values ?: listOf())
          }

          override fun isPick(pick: EditorPick): Inspectable = InspectableValue.Enum(pick.selected)

          override fun isNumber(number: EditorNumber): Inspectable =
              InspectableValue.Number(number.value)

          override fun isColor(number: EditorColor): Inspectable =
              InspectableValue.Color(number.value.toInt().let { Color.fromColor(it) })

          override fun isString(string: EditorString): Inspectable =
              InspectableValue.Text(string.value ?: "")

          override fun isBool(bool: EditorBool): Inspectable = InspectableValue.Boolean(bool.value)
        })
  }

  private fun fromDrawable(d: Drawable?): Inspectable =
      when (d) {
        is ColorDrawable -> InspectableValue.Color(Color.fromColor(d.color))
        else -> InspectableValue.Unknown(d.toString())
      }
}
