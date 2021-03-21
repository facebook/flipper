/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.retrofit2protobuf

import com.facebook.flipper.android.AndroidFlipperClient
import com.facebook.flipper.core.FlipperArray
import com.facebook.flipper.core.FlipperObject
import com.facebook.flipper.core.FlipperValue
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin
import com.facebook.flipper.plugins.retrofit2protobuf.adapter.GenericCallDefinitionsToMessageDefinitionsIfProtobuf
import com.facebook.flipper.plugins.retrofit2protobuf.adapter.RetrofitServiceToGenericCallDefinitions
import com.facebook.flipper.plugins.retrofit2protobuf.model.CallNestedMessagesPayload
import me.haroldmartin.protobufjavatoprotobufjs.adapter.FullNamedMessagesToNestedMessages

object SendProtobufToFlipperFromRetrofit {
    operator fun invoke(baseUrl: String, service: Class<*>) {
        AndroidFlipperClient.getInstanceIfInitialized()?.let { client ->
            (client.getPlugin(NetworkFlipperPlugin.ID) as? NetworkFlipperPlugin)
                ?.send("addProtobufDefinitions", generateProtobufDefinitions(baseUrl, service))
        }
    }

    private fun generateProtobufDefinitions(baseUrl: String, service: Class<*>): FlipperObject {
        return RetrofitServiceToGenericCallDefinitions(service).let { definitions ->
            GenericCallDefinitionsToMessageDefinitionsIfProtobuf(definitions)
        }.let { messages ->
            messages.map {
                CallNestedMessagesPayload(
                    path = it.path,
                    method = it.method,
                    requestMessageFullName = it.requestMessageFullName,
                    requestDefinitions = FullNamedMessagesToNestedMessages(it.requestModel),
                    responseMessageFullName = it.responseMessageFullName,
                    responseDefinitions = FullNamedMessagesToNestedMessages(it.responseModel)
                )
            }
        }.let { payload ->
            FlipperObject.Builder().put(baseUrl, payload.toFlipperArray()).build()
        }
    }
}

private fun Iterable<FlipperValue>.toFlipperArray(): FlipperArray =
    fold(FlipperArray.Builder()) { builder, call -> builder.put(call) }.build()
