/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Tristate} from '../reducers/settings';
import ReleaseChannel from '../ReleaseChannel';

export default function (_props: {
  isPrefetchingEnabled: Tristate;
  onEnablePrefetchingChange: (v: Tristate) => void;
  isLocalPinIgnored: boolean;
  onIgnoreLocalPinChange: (v: boolean) => void;
  releaseChannel: ReleaseChannel;
  onReleaseChannelChange: (v: ReleaseChannel) => void;
}) {
  return null;
}
