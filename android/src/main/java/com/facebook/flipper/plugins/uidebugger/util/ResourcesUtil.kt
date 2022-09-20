/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.util

import android.content.res.Resources
import android.content.res.Resources.NotFoundException
import javax.annotation.Nonnull

object ResourcesUtil {
  @Nonnull
  fun getIdStringQuietly(idContext: Any, r: Resources?, resourceId: Int): String {
    return try {
      getIdString(r, resourceId)
    } catch (e: NotFoundException) {
      getFallbackIdString(resourceId)
    }
  }

  @Throws(NotFoundException::class)
  fun getIdString(r: Resources?, resourceId: Int): String {
    if (r == null) {
      return getFallbackIdString(resourceId)
    }
    val prefix: String
    val prefixSeparator: String
    when (getResourcePackageId(resourceId)) {
      0x7f -> {
        prefix = ""
        prefixSeparator = ""
      }
      else -> {
        prefix = r.getResourcePackageName(resourceId)
        prefixSeparator = ":"
      }
    }
    val typeName = r.getResourceTypeName(resourceId)
    val entryName = r.getResourceEntryName(resourceId)
    val sb =
        StringBuilder(
            1 + prefix.length + prefixSeparator.length + typeName.length + 1 + entryName.length)
    sb.append("@")
    sb.append(prefix)
    sb.append(prefixSeparator)
    sb.append(typeName)
    sb.append("/")
    sb.append(entryName)
    return sb.toString()
  }

  private fun getFallbackIdString(resourceId: Int): String {
    return "#" + Integer.toHexString(resourceId)
  }

  private fun getResourcePackageId(id: Int): Int {
    return (id ushr 24) and 0xff
  }
}
