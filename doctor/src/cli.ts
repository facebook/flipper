/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {runHealthchecks} from './index';

(async () => {
  const results = await runHealthchecks();

  console.log(JSON.stringify(results, null, 2));
})();
