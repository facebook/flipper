/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.retrofit2protobuf.adapter

import com.facebook.flipper.plugins.retrofit2protobuf.model.GenericCallDefinition
import java.lang.reflect.Method
import java.lang.reflect.ParameterizedType
import java.lang.reflect.Type

internal object RetrofitServiceToGenericCallDefinitions {
    @Suppress("LoopWithTooManyJumpStatements")
    operator fun invoke(service: Class<*>): List<GenericCallDefinition> {
        val methodToProtobufDefinition = mutableListOf<GenericCallDefinition>()
        for (method in service.declaredMethods) {
            val responseType = method.innerGenericReturnClass ?: continue
            val (path, httpMethod) = method.annotations.urlPathAndMethod ?: continue
            methodToProtobufDefinition.add(
                GenericCallDefinition(
                    path = path,
                    method = httpMethod,
                    responseType = responseType,
                    requestType = method.requestBodyType
                )
            )
        }
        return methodToProtobufDefinition
    }
}

private val Array<Annotation>.urlPathAndMethod: Pair<String, String>?
    get() {
        var path: Pair<String, String>? = null
        for (a in this) {
            path = when (a.annotationClass) {
                retrofit2.http.DELETE::class -> (a as retrofit2.http.DELETE).value to "DELETE"
                retrofit2.http.GET::class -> (a as retrofit2.http.GET).value to "GET"
                retrofit2.http.HEAD::class -> (a as retrofit2.http.HEAD).value to "HEAD"
                retrofit2.http.OPTIONS::class -> (a as retrofit2.http.OPTIONS).value to "OPTIONS"
                retrofit2.http.PATCH::class -> (a as retrofit2.http.PATCH).value to "PATCH"
                retrofit2.http.POST::class -> (a as retrofit2.http.POST).value to "POST"
                retrofit2.http.PUT::class -> (a as retrofit2.http.PUT).value to "PUT"
                else -> null
            }
            if (path != null) break
        }
        return path
    }

private val Method.requestBodyType: Class<*>?
    get() {
        parameterAnnotations.forEachIndexed { index, annotations ->
            annotations.forEach { annotation ->
                if (annotation.annotationClass == retrofit2.http.Body::class) {
                    return parameterTypes[index]
                }
            }
        }
        return null
    }

private val Method.innerGenericReturnClass: Class<*>?
    get() = (genericReturnType as? ParameterizedType)?.innerGenericType as? Class<*>

private val ParameterizedType?.innerGenericType: Type?
    get() {
        val innerType = this?.actualTypeArguments?.get(0)
        return if (innerType is ParameterizedType) {
            innerType.innerGenericType
        } else {
            innerType
        }
    }
