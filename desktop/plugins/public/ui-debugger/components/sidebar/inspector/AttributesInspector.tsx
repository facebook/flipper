/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Color, Inspectable, InspectableObject, UINode} from '../../../types';
import {Panel} from 'flipper-plugin';

type Props = {
  node: UINode;
};

const TextAttributeInspector: React.FC<{name: string; value: string}> = ({
  name,
  value,
}) => {
  return (
    <div>
      {name}: {value}
    </div>
  );
};

const NumberAttributeInspector: React.FC<{name: string; value: number}> = ({
  name,
  value,
}) => {
  return (
    <div>
      {name}: {value}
    </div>
  );
};

const ColorAttributeInspector: React.FC<{name: string; value: Color}> = ({
  name,
  value,
}) => {
  return (
    <div>
      {name}: {JSON.stringify(value)}
    </div>
  );
};

const ObjectAttributeInspector: React.FC<{
  name: string;
  value: Record<string, Inspectable>;
}> = ({name, value}) => {
  return (
    <div>
      {name}: {JSON.stringify(value)}
    </div>
  );
};

function create(key: string, inspectable: Inspectable) {
  switch (inspectable.type) {
    case 'text':
      return <TextAttributeInspector name={key} value={inspectable.value} />;
    case 'number':
      return <NumberAttributeInspector name={key} value={inspectable.value} />;
    case 'color':
      return <ColorAttributeInspector name={key} value={inspectable.value} />;
    case 'object':
      return <ObjectAttributeInspector name={key} value={inspectable.fields} />;
    default:
      return;
  }
}

function createSection(name: string, inspectable: InspectableObject) {
  return (
    <Panel key={name} title={name}>
      {' '}
      {Object.keys(inspectable.fields).map(function (key, _) {
        return create(key, inspectable.fields[key]);
      })}
    </Panel>
  );
}

export const AttributesInspector: React.FC<Props> = ({node}) => {
  // TODO: add raw panel to inspect data as received.
  return (
    <>
      {Object.keys(node.attributes).map(function (key, _) {
        return createSection(key, node.attributes[key] as InspectableObject);
      })}
    </>
  );
};
