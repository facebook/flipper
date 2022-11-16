/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/**
 * Utility function that generates a more human-readable name
 * for an attribute in lowerCamelCase format.
 * @param attribute Attribute name in the form of lowerCamelCase
 * @returns Displayable name for the provided attribute.
 */
export function displayableName(attribute: string): string {
  if (attribute.length > 0) {
    const displayable = attribute[0].toUpperCase() + attribute.substring(1);
    return displayable.replace(/([a-z](?=[A-Z]))/g, '$1 ');
  }
  return '';
}
