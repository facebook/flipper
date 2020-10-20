/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Client from '../Client';
import {Logger} from '../fb-interfaces/Logger';
import {PluginClient} from '../plugin';
import {Element} from '../ui';

export default [] as Array<
  (
    client: PluginClient,
    realClient: Client,
    selectedNode: Element,
    logger: Logger,
  ) => React.ReactNode
>;
