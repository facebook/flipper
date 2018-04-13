/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Node} from 'react';

function isReactElement(object: any) {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.$$typeof === Symbol.for('react.element')
  );
}

/**
 * Recursively walks through all children of a React element and returns
 * the string representation of the leafs concatenated.
 */
export default (node: Node): string => {
  let res = '';
  const traverse = (node: Node) => {
    if (typeof node === 'string' || typeof node === 'number') {
      // this is a leaf, add it to the result string
      res += node;
    } else if (Array.isArray(node)) {
      // traverse all array members and recursively stringify them
      node.forEach(traverse);
    } else if (isReactElement(node)) {
      // node is a react element access its children an recursively stringify them
      // $FlowFixMe
      const {children} = node.props;
      if (Array.isArray(children)) {
        children.forEach(traverse);
      } else {
        traverse(children);
      }
    }
  };

  traverse(node);

  return res;
};
