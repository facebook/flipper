/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {safeFilename} from '../safeFilename';

describe('safeFilename', () => {
  test('replaces special chars in a string to make it a safe file name', async () => {
    expect(safeFilename('/data/data/0/files/sonar/spec!al file   name%')).toBe(
      '-data-data-0-files-sonar-spec-al-file-name-',
    );
  });
});
