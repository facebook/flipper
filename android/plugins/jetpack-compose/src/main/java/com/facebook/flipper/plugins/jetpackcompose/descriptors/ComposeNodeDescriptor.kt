/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.jetpackcompose.descriptors

import com.facebook.flipper.plugins.jetpackcompose.JetpackComposeTag
import com.facebook.flipper.plugins.jetpackcompose.descriptors.ComposeNodeDescriptor.toInspectableValue
import com.facebook.flipper.plugins.jetpackcompose.model.ComposeNode
import com.facebook.flipper.plugins.uidebugger.descriptors.BaseTags
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.Color
import com.facebook.flipper.plugins.uidebugger.model.Coordinate
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.flipper.plugins.uidebugger.util.Immediate
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred
import facebook.internal.androidx.compose.ui.inspection.inspector.NodeParameter
import facebook.internal.androidx.compose.ui.inspection.inspector.ParameterType

object ComposeNodeDescriptor : NodeDescriptor<ComposeNode> {

  private const val NAMESPACE = "ComposeNode"

  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)
  private val IdAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "id")
  private val KeyAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "key")
  private val NameAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_IDENTITY, NAMESPACE, "name")
  private val FilenameAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_IDENTITY, NAMESPACE, "filename")
  private val PackageHashAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_IDENTITY, NAMESPACE, "packageHash")
  private val LineNumberAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_IDENTITY, NAMESPACE, "lineNumber")
  private val OffsetAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_IDENTITY, NAMESPACE, "offset")
  private val LengthAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_IDENTITY, NAMESPACE, "length")
  private val BoxAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "box")
  private val BoundsAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "bounds")
  private val Bounds0AttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "(x0, y0)")
  private val Bounds1AttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "(x1, y1)")
  private val Bounds2AttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "(x2, y2)")
  private val Bounds3AttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "(x3, y3)")
  private val ViewIdAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "viewId")
  private val ParametersAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "Parameters")
  private val MergedSemanticsAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "MergedSemantics")
  private val UnmergedSemanticsAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "DeclaredSemantics")

  override fun getName(node: ComposeNode): String = node.inspectorNode.name

  override fun getChildren(node: ComposeNode): List<Any> {
    return node.children
  }

  override fun getAttributes(node: ComposeNode): MaybeDeferred<Map<MetadataId, InspectableObject>> {

    val builder = mutableMapOf<MetadataId, InspectableObject>()
    val props = mutableMapOf<Int, Inspectable>()

    props[IdAttributeId] = InspectableValue.Number(node.inspectorNode.id)
    props[ViewIdAttributeId] = InspectableValue.Number(node.inspectorNode.viewId)
    props[KeyAttributeId] = InspectableValue.Number(node.inspectorNode.key)
    props[NameAttributeId] = InspectableValue.Text(node.inspectorNode.name)
    props[FilenameAttributeId] = InspectableValue.Text(node.inspectorNode.fileName)
    props[PackageHashAttributeId] = InspectableValue.Number(node.inspectorNode.packageHash)
    props[LineNumberAttributeId] = InspectableValue.Number(node.inspectorNode.lineNumber)
    props[OffsetAttributeId] = InspectableValue.Number(node.inspectorNode.offset)
    props[LengthAttributeId] = InspectableValue.Number(node.inspectorNode.length)

    props[BoxAttributeId] =
        InspectableValue.Bounds(
            Bounds(
                node.inspectorNode.left,
                node.inspectorNode.top,
                node.inspectorNode.width,
                node.inspectorNode.height))

    node.inspectorNode.bounds?.let { bounds ->
      val quadBounds = mutableMapOf<Int, Inspectable>()
      quadBounds[Bounds0AttributeId] = InspectableValue.Coordinate(Coordinate(bounds.x0, bounds.y0))
      quadBounds[Bounds1AttributeId] = InspectableValue.Coordinate(Coordinate(bounds.x1, bounds.y1))
      quadBounds[Bounds2AttributeId] = InspectableValue.Coordinate(Coordinate(bounds.x2, bounds.y2))
      quadBounds[Bounds3AttributeId] = InspectableValue.Coordinate(Coordinate(bounds.x3, bounds.y3))
      props[BoundsAttributeId] = InspectableObject(quadBounds.toMap())
    }

    val params = mutableMapOf<Int, Inspectable>()
    node.parameters.forEach { parameter ->
      fillNodeParameters(parameter, params, node.inspectorNode.name)
    }
    builder[ParametersAttributeId] = InspectableObject(params.toMap())

    val mergedSemantics = mutableMapOf<Int, Inspectable>()
    node.mergedSemantics.forEach { parameter ->
      fillNodeParameters(parameter, mergedSemantics, node.inspectorNode.name)
    }
    builder[MergedSemanticsAttributeId] = InspectableObject(mergedSemantics.toMap())

    val unmergedSemantics = mutableMapOf<Int, Inspectable>()
    node.unmergedSemantics.forEach { parameter ->
      fillNodeParameters(parameter, unmergedSemantics, node.inspectorNode.name)
    }
    builder[UnmergedSemanticsAttributeId] = InspectableObject(unmergedSemantics.toMap())

    builder[SectionId] = InspectableObject(props.toMap())

    return Immediate(builder)
  }

  override fun getInlineAttributes(node: ComposeNode): Map<String, String> {
    val attributes = mutableMapOf<String, String>()
    if (!node.inspectorNode.inlined) {
      node.recompositionCount?.let { attributes["🔄"] = it.toString() }
      node.skipCount?.let { attributes["⏭️"] = it.toString() }
    } else {
      attributes["inline"] = "true"
    }
    return attributes
  }

  override fun getBounds(node: ComposeNode): Bounds {
    return node.bounds
  }

  override fun getQualifiedName(node: ComposeNode): String = node.inspectorNode.name

  override fun getActiveChild(node: ComposeNode): Any? = null

  override fun getTags(node: ComposeNode): Set<String> = setOf(BaseTags.Android, JetpackComposeTag)

  override fun getId(node: ComposeNode): Id = node.inspectorNode.id.toInt()

  /** Recursively fills [params] map with the values starting at [rootParameter]. */
  private fun fillNodeParameters(
      rootParameter: NodeParameter,
      params: MutableMap<Int, Inspectable>,
      parentNamespace: String
  ) {
    if (rootParameter.elements.isEmpty()) {
      params[
          MetadataRegister.register(
              MetadataRegister.TYPE_ATTRIBUTE, parentNamespace, rootParameter.name)] =
          rootParameter.toInspectableValue()
    } else {
      val elements = mutableMapOf<Int, Inspectable>()
      rootParameter.elements.forEach { element ->
        fillNodeParameters(element, elements, rootParameter.name)
      }
      params[
          MetadataRegister.register(
              MetadataRegister.TYPE_ATTRIBUTE, parentNamespace, rootParameter.name)] =
          InspectableObject(elements.toMap())
    }
  }

  private fun NodeParameter.toInspectableValue(): InspectableValue {
    return when (type) {
      ParameterType.Iterable,
      ParameterType.String -> InspectableValue.Text(value.toString())
      ParameterType.Boolean -> InspectableValue.Boolean(value as Boolean)
      ParameterType.Int32 -> InspectableValue.Number(value as Int)
      ParameterType.Int64 -> InspectableValue.Number(value as Long)
      ParameterType.Double -> InspectableValue.Number(value as Double)
      ParameterType.Float -> InspectableValue.Number(value as Float)
      ParameterType.DimensionDp -> InspectableValue.Text("${value as Float}.dp")
      ParameterType.DimensionSp -> InspectableValue.Text("${value as Float}.sp")
      ParameterType.DimensionEm -> InspectableValue.Text("${value as Float}.em")
      ParameterType.Color -> InspectableValue.Color(Color.fromColor(value as Int))
      ParameterType.Lambda,
      ParameterType.FunctionReference -> {
        val parameterValue = value
        if (parameterValue !is Array<*> || parameterValue.size > 2 || parameterValue.size == 0) {
          InspectableValue.Unknown(parameterValue?.toString() ?: "")
        } else {
          val instance = parameterValue[0]
          InspectableValue.Text(instance?.javaClass?.name ?: "")
        }
      }
      else -> InspectableValue.Unknown(value?.toString() ?: "")
    }
  }
}
