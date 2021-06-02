/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.retrofit2protobuf.adapter

import com.facebook.flipper.plugins.retrofit2protobuf.model.FullNamedMessagesCallDefinition
import com.facebook.flipper.plugins.retrofit2protobuf.model.GenericCallDefinition
import me.haroldmartin.protobufjavatoprotobufjs.ProtobufGeneratedJavaToProtobufJs

internal object GenericCallDefinitionsToMessageDefinitionsIfProtobuf {
    operator fun invoke(callDefinitions: List<GenericCallDefinition>): List<FullNamedMessagesCallDefinition> {
        return callDefinitions.mapNotNull { definition ->
            val responseRootAndMessages = definition.responseType?.let {
                ProtobufGeneratedJavaToProtobufJs(it)
            }
            val requestRootAndMessages = definition.requestType?.let {
                ProtobufGeneratedJavaToProtobufJs(it)
            }

            FullNamedMessagesCallDefinition(
                path = definition.path,
                method = definition.method,
                responseMessageFullName = responseRootAndMessages?.rootFullName,
                responseModel = responseRootAndMessages?.descriptors,
                requestMessageFullName = requestRootAndMessages?.rootFullName,
                requestModel = requestRootAndMessages?.descriptors
            )
        }
    }
}
