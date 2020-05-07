/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginClient, Client, Element} from 'flipper';
import {Logger} from 'app/src/fb-interfaces/Logger';

export default [] as Array<
  (
    client: PluginClient,
    realClient: Client,
    selectedNode: Element,
    logger: Logger,
  ) => React.ReactNode
>;
