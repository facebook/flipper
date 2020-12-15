/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import config from '../fb-stubs/config';
import GK from '../fb-stubs/GK';
import ReleaseChannel from '../ReleaseChannel';
import {store} from '../store';

export default function isSandyEnabled() {
  return (
    (GK.get('flipper_sandy') ||
      config.getReleaseChannel() === ReleaseChannel.INSIDERS) &&
    !store.getState().settingsState.disableSandy
  );
}
