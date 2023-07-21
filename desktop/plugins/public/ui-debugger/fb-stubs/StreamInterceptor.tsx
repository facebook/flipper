/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceOS} from 'flipper-plugin';
import {Id, Metadata, UINode} from '../ClientTypes';
import {StreamInterceptor} from '../DesktopTypes';

export function getStreamInterceptor(_: DeviceOS): StreamInterceptor {
  return new NoOpStreamInterceptor();
}

class NoOpStreamInterceptor implements StreamInterceptor {
  init() {
    return null;
  }

  async transformNodes(
    nodes: Map<Id, UINode>,
  ): Promise<[Map<Id, UINode>, Metadata[]]> {
    return [nodes, []];
  }

  async transformMetadata(metadata: Metadata): Promise<Metadata> {
    return metadata;
  }
}
