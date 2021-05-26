/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Client, Logger, PluginClient, Element} from 'flipper';

export const SidebarExtensions: Record<
  string,
  React.FC<{
    client: PluginClient;
    realClient: Client;
    selectedNode: Element;
    logger: Logger;
  }>
> = {};
