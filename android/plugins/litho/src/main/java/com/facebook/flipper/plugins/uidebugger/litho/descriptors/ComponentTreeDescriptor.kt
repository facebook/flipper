/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors

import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.OffsetChild
import com.facebook.flipper.plugins.uidebugger.litho.LithoTag
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.flipper.plugins.uidebugger.util.Deferred
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred
import com.facebook.litho.ComponentTree
import com.facebook.litho.DebugComponent
import com.facebook.litho.config.ComponentsConfiguration
import java.lang.Exception
import java.lang.reflect.Field
import java.lang.reflect.Modifier

class ComponentTreeDescriptor(val register: DescriptorRegister) : NodeDescriptor<ComponentTree> {

  private val NAMESPACE = "ComponentTree"

  private val MetadataSectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "Tree Metadata")

  private val ConfigurationSectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "Tree Configuration")

  private val ComponentTreeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, "treeConfiguration", "id")

  private val qualifiedName = ComponentTree::class.qualifiedName ?: ""

  override fun getId(node: ComponentTree): Id = node.id

  override fun getBounds(node: ComponentTree): Bounds {
    val rootComponent = DebugComponent.getRootInstance(node)
    return if (rootComponent != null) {
      Bounds.fromRect(rootComponent.boundsInParentDebugComponent)
    } else {
      Bounds(0, 0, 0, 0)
    }
  }

  override fun getName(node: ComponentTree): String = "ComponentTree"

  override fun getQualifiedName(node: ComponentTree): String = qualifiedName

  override fun getChildren(node: ComponentTree): List<Any> {
    val result = mutableListOf<Any>()
    val debugComponent = DebugComponent.getRootInstance(node)
    if (debugComponent != null) {
      result.add(
          // we want the component tree to take the size and any offset so we reset this one
          OffsetChild.zero(
              debugComponent, register.descriptorForClassUnsafe(debugComponent.javaClass)))
    }
    return result
  }

  override fun getActiveChild(node: ComponentTree): Any? = null

  override fun getAttributes(
      node: ComponentTree
  ): MaybeDeferred<Map<MetadataId, InspectableObject>> {
    return Deferred {
      val attributeSections = mutableMapOf<MetadataId, InspectableObject>()

      attributeSections[MetadataSectionId] =
          InspectableObject(mapOf(ComponentTreeId to InspectableValue.Number(node.id)))

      attributeSections[ConfigurationSectionId] =
          InspectableObject(getLithoConfigurationAttributes(node))

      attributeSections
    }
  }

  private fun getLithoConfigurationAttributes(tree: ComponentTree): Map<MetadataId, Inspectable> {
    val (configurationInstance, configurationFields) =
        getConfigurationFieldsAndValuesUsingReflection(tree)

    return configurationFields
        .filter { !Modifier.isStatic(it.modifiers) }
        .associate { field ->
          val metadataId =
              MetadataRegister.register(
                  MetadataRegister.TYPE_ATTRIBUTE, "componentsConfiguration", field.name)

          field.isAccessible = true

          val inspectableValue =
              when (val value = field.get(configurationInstance)) {
                is Number -> InspectableValue.Number(value)
                is Boolean -> InspectableValue.Boolean(value)
                is String -> InspectableValue.Text(value)
                else -> InspectableValue.Unknown(value?.toString() ?: "null")
              }

          metadataId to inspectableValue
        }
  }

  /**
   * This function is only being used while Litho doesn't release a new OSS version. This is needed
   * because both the [ComponentsConfiguration] and [ComponentTree.getLithoConfiguration] have been
   * modified since the version Flipper OSS has been associated with.
   */
  private fun getConfigurationFieldsAndValuesUsingReflection(
      tree: ComponentTree
  ): Pair<Any?, Array<Field>> {
    try {
      // TODO: use `getConfigurationFieldsAndValues` once Litho does a new OSS release
      // 1. get LithoConfiguration
      val lithoConfigurationMethod = tree.javaClass.getDeclaredMethod("getLithoConfiguration")
      val lithoConfigurationInstance = lithoConfigurationMethod.invoke(tree)

      // 2. get ComponentsConfiguration from LithoConfiguration instance
      val configurationField =
          lithoConfigurationInstance?.javaClass?.getDeclaredField("componentsConfig")
      val configurationInstance = configurationField?.get(lithoConfigurationInstance)

      // 3. get the fields from the configuration
      val configurationFields = configurationInstance?.javaClass?.declaredFields ?: emptyArray()
      return configurationInstance to configurationFields
    } catch (exception: Exception) {
      // Getting all exceptions since this is so britle and we don't want to crash the whole UI
      // Debugger.
      return null to emptyArray()
    }
  }

  // private fun getConfigurationFieldsAndValues(tree: ComponentTree): Pair<Any?, Array<Field>> {
  //   val configuration = tree.lithoConfiguration.componentsConfig
  //   return configuration to configuration.javaClass.declaredFields
  // }

  override fun getTags(node: ComponentTree): Set<String> = setOf(LithoTag, "TreeRoot")
}
