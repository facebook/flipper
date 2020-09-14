/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {isInternal} from 'internaldocs-fb-helpers';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

function createElement(createElement) {
  if (!createElement) return undefined;
  if (React.isValidElement(createElement)) {
    return createElement;
  }
  if (typeof createElement === 'string') {
    return createElement;
  }
  const element = createElement();
  if (React.isValidElement(element)) {
    return element;
  }
  return React.createElement(element.default || element, {});
}

function FBContent({internal, external}) {
  if (!isInternal()) {
    return createElement(external);
  }
  if (internal && external) {
    return (
      <Tabs
        defaultValue="internal-docs"
        values={[
          {label: 'FB Internal', value: 'internal-docs'},
          {label: 'Open-Source', value: 'external-docs'},
        ]}>
        <TabItem value="internal-docs">{createElement(internal)}</TabItem>
        <TabItem value="external-docs">{createElement(external)}</TabItem>
      </Tabs>
    );
  } else {
    return createElement(internal || external);
  }
}

export default FBContent;
