/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataTableColumn, createTablePlugin} from 'flipper-plugin';

type Row = {
  id: number;
  Name: string;
  Expires: string;
  Value: string;
};

const columns: DataTableColumn<Row>[] = [
  {
    key: 'Name',
    width: 250,
  },
  {
    key: 'Expires',
    width: 250,
  },
  {
    key: 'Value',
  },
];

module.exports = createTablePlugin<Row>({
  columns,
  key: 'id',
  method: 'addCookie',
  resetMethod: 'resetCookies',
});
