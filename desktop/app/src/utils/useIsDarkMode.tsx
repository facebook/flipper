/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useStore} from '../../../app/src/utils/useStore';
import GK from '../fb-stubs/GK';
/**
 * This hook returns whether dark mode is currently being used.
 * Generally should be avoided in favor of using the above theme object,
 * which will provide colors that reflect the theme
 */
export function useIsDarkMode(): boolean {
  return useStore(
    (state) =>
      GK.get('flipper_sandy') &&
      !state.settingsState.disableSandy &&
      state.settingsState.darkMode,
  );
}
