/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// TODO: Fix this the next time the file is edited.
// eslint-disable-next-line rulesdir/no-restricted-imports-clone
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
