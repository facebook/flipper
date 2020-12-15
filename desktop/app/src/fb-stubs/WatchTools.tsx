/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {Component} from 'react';
import {StaticViewProps} from '../reducers/connections';
import {Text} from '../ui';

export default class extends Component<StaticViewProps, {}> {
  render() {
    return <Text>Debug Videos on Watch Bugs.</Text>;
  }
}
