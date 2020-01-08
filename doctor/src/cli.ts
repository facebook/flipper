/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getHealthchecks} from './index';
import {getEnvInfo} from './environmentInfo';

(async () => {
  const environmentInfo = await getEnvInfo();
  console.log(JSON.stringify(environmentInfo));
  const healthchecks = getHealthchecks();
  const results = await Promise.all(
    Object.entries(healthchecks).map(async ([key, category]) => [
      key,
      category.isSkipped
        ? category
        : {
            label: category.label,
            results: await Promise.all(
              category.healthchecks.map(async ({key, label, run}) => ({
                key,
                label,
                result: await run(environmentInfo),
              })),
            ),
          },
    ]),
  );

  console.log(JSON.stringify(results, null, 2));
})();
