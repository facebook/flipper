/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {unstable_batchedUpdates} from 'react-dom';
import {_setBatchedUpdateImplementation} from 'flipper-plugin-core';

_setBatchedUpdateImplementation(unstable_batchedUpdates);
