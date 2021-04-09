/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Client, Logger, PluginClient, Element} from 'flipper';

export default [] as Array<
  (
    client: PluginClient,
    realClient: Client,
    selectedNode: Element,
    logger: Logger,
  ) => React.ReactNode
>;
