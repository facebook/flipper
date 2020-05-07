/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ajv from 'ajv';
import path from 'path';
import fs from 'fs-extra';

export default function (inputDirectory: string) {
  const filePathExists: ajv.KeywordDefinition = {
    errors: true,
    compile: function validatePathExists(schema: any) {
      function filePathExistsValidator(value: any, dataPath: any) {
        const it = filePathExistsValidator as ajv.SchemaValidateFunction;
        if (!schema) {
          return true;
        }
        it.errors = [];
        const tpl = {
          keyword: 'filePathExists',
          dataPath,
          schemaPath: '',
          params: [],
        };
        const fullPath = path.resolve(inputDirectory, value);
        if (!fs.pathExistsSync(fullPath) || !fs.lstatSync(fullPath).isFile()) {
          it.errors.push({
            ...tpl,
            message: `should point to a valid file`,
          });
        }
        return it.errors.length === 0;
      }
      return filePathExistsValidator;
    },
  };
  return filePathExists;
}
