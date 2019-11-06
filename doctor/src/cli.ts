/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getEnvInfo} from './environmentInfo';
import {getHealthchecks} from './index';

(async () => {
  const environmentInfo = await getEnvInfo();
  const healthchecks = getHealthchecks();
  const results = Object.entries(healthchecks).map(([key, category]) => [
    key,
    category
      ? {
          label: category.label,
          results: category.healthchecks.map(({label, run}) => ({
            label,
            result: run(environmentInfo),
          })),
        }
      : {},
  ]);

  console.log(JSON.stringify(results, null, 2));
})();
