/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Inspectable, InspectableObject, Metadata, MetadataId} from './types';

function transformAny(
  metadata: Map<MetadataId, Metadata>,
  inspectable: Inspectable,
): any {
  switch (inspectable.type) {
    case 'boolean':
    case 'text':
    case 'number':
    case 'color':
    case 'size':
    case 'bounds':
    case 'coordinate':
    case 'coordinate3d':
    case 'enum':
    case 'space':
      return inspectable.value;
    case 'object':
      return transformObject(metadata, inspectable);
    default:
      return JSON.parse(JSON.stringify(inspectable));
  }
}

function transformObject(
  metadata: Map<MetadataId, Metadata>,
  inspectableObject: InspectableObject,
): any {
  const object: any = {};
  Object.keys(inspectableObject.fields).forEach((key, _index) => {
    const metadataId: number = Number(key);
    const meta = metadata.get(metadataId);
    if (!meta) {
      return;
    }

    const inspectable = inspectableObject.fields[metadataId];
    object[meta.name] = transformAny(metadata, inspectable);
  });

  return object;
}

export function transform(
  attributes: Record<MetadataId, Inspectable>,
  metadata: Map<MetadataId, Metadata>,
): any {
  const object: any = {};
  Object.keys(attributes).forEach((key) => {
    const metadataId: number = Number(key);
    const meta = metadata.get(metadataId);
    if (!meta) {
      return;
    }

    const inspectable = attributes[metadataId] as InspectableObject;
    object[meta.name] = transformObject(metadata, inspectable);
  });
  return object;
}
