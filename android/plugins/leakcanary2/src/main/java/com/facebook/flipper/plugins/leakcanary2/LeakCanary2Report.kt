package com.facebook.flipper.plugins.leakcanary2

import com.facebook.flipper.core.FlipperArray
import com.facebook.flipper.core.FlipperObject
import com.facebook.flipper.core.FlipperValue
import shark.LeakTrace
import shark.LeakTraceObject
import java.util.UUID

internal data class LeakCanary2Report(val leaks: List<Leak>) : FlipperValue {
    override fun toFlipperObject(): FlipperObject = FlipperObject.Builder()
        .put("leaks", leaks.map { it.toFlipperObject() }.toFlipperArray())
        .build()
}

internal data class Leak(
    val title: String,
    val root: String,
    val elements: Map<String, Element>,
    val retainedSize: String,
    val signature: String,
    val details: String
) : FlipperValue {
    override fun toFlipperObject(): FlipperObject {
        return FlipperObject.Builder()
            .put("title", title)
            .put("root", root)
            .put("elements", elements.toFlipperObject())
            .put("retainedSize", retainedSize)
            .put("details", details)
            .build()
    }

    private fun Map<String, FlipperValue>.toFlipperObject(): FlipperObject =
        mapValues { it.value.toFlipperObject() }.toFlipperObject()

    @JvmName("toFlipperObjectStringFlipperObject")
    private fun Map<String, FlipperObject>.toFlipperObject(): FlipperObject =
        asIterable()
            .fold(FlipperObject.Builder()) { builder, entry ->
                builder.put(entry.key, entry.value)
            }
            .build()
}

internal fun LeakTrace.toLeak(title: String): Leak {
    val elements = getElements()
    return Leak(
        title = title,
        elements = elements.toMap(),
        retainedSize = retainedHeapByteSize?.let { "$it bytes" } ?: "unknown size",
        signature = signature,
        root = elements.first().first,
        details = "$this"
    )
}

private fun LeakTrace.getElements(): List<Pair<String, Element>> {
    val referenceElements = referencePath.map { reference ->
        val id = UUID.randomUUID().toString()
        id to Element(id, reference.originObject)
    }.toMutableList()

    val leakId = UUID.randomUUID().toString()
    referenceElements.add(leakId to Element(leakId, leakingObject))

    return referenceElements.mapIndexed { index, pair ->
        pair.first to if (index == referenceElements.lastIndex) pair.second else pair.second.copy(
            children = listOf(referenceElements[index + 1].second.id)
        )
    }
}

internal data class Element(
    val id: String,
    val name: String,
    val expanded: Boolean = true,
    val children: List<String> = emptyList(),
    val attributes: List<ElementAttribute>,
    val decoration: String = ""
) : FlipperValue {
    constructor(id: String, leakObject: LeakTraceObject) : this(
        id = id,
        name = "${leakObject.className} (${leakObject.typeName})",
        attributes = listOf(
            ElementAttribute("leaking", leakObject.leakingStatus.shortName),
            ElementAttribute("retaining", leakObject.retaining)
        )
    )

    override fun toFlipperObject(): FlipperObject {
        return FlipperObject.Builder()
            .put("id", id)
            .put("name", name)
            .put("expanded", expanded)
            .put("children", children.toFlipperArray())
            .put("attributes", attributes.toFlipperArray())
            .put("data", EMPTY_FLIPPER_OBJECT)
            .put("decoration", decoration)
            .put("extraInfo", EMPTY_FLIPPER_OBJECT)
            .build()
    }

    @JvmName("toFlipperArrayFlipperValue")
    private fun Iterable<FlipperValue>.toFlipperArray(): FlipperArray =
        map { it.toFlipperObject() }.toFlipperArray()

    @JvmName("toFlipperArrayString")
    private fun Iterable<String>.toFlipperArray(): FlipperArray =
        fold(FlipperArray.Builder()) { builder, row -> builder.put(row) }.build()
}

internal fun Iterable<FlipperObject>.toFlipperArray(): FlipperArray =
    fold(FlipperArray.Builder()) { builder, row -> builder.put(row) }.build()

private val LeakTraceObject.LeakingStatus.shortName: String
    get() = when (this) {
        LeakTraceObject.LeakingStatus.NOT_LEAKING -> "N"
        LeakTraceObject.LeakingStatus.LEAKING -> "Y"
        LeakTraceObject.LeakingStatus.UNKNOWN -> "?"
    }
private val LeakTraceObject.retaining: String
    get() = retainedHeapByteSize?.let { "$it bytes ($retainedObjectCount objects)" } ?: "unknown"

private val EMPTY_FLIPPER_OBJECT = FlipperObject.Builder().build()

data class ElementAttribute(
    val name: String,
    val value: String
) : FlipperValue {
    override fun toFlipperObject(): FlipperObject {
        return FlipperObject.Builder()
            .put("name", name)
            .put("value", value)
            .build()
    }
}
