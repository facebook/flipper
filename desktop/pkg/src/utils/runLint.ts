/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import path from 'path';
import Ajv from 'ajv';
import filePathExists from './validation/filePathExists';

const pluginPackageJsonSchemaUrl =
  'https://fbflipper.com/schemas/plugin-package/v2.json';

const packageJsonSchemaUrl =
  'https://schemastore.azurewebsites.net/schemas/json/package.json';

const schemasDir = path.resolve(__dirname, '..', '..', 'schemas');
const packageJsonSchemaPath = path.join(schemasDir, 'package.json');
const pluginPackageJsonSchemaPath = path.join(
  schemasDir,
  'plugin-package-v2.json',
);

export default async function runLint(
  inputDirectory: string,
): Promise<null | string[]> {
  const packageJsonPath = path.join(inputDirectory, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    return [
      `package.json not found in plugin source directory ${inputDirectory}.`,
    ];
  }
  const packageJsonString = (await fs.readFile(packageJsonPath)).toString();
  const packageJson = JSON.parse(packageJsonString);
  if (!packageJson.$schema) {
    return [
      [
        `. should have required property "$schema" pointing to a supported schema URI, e.g.:`,
        `{`,
        ` "$schema": "${pluginPackageJsonSchemaUrl}",`,
        ` "name": "flipper-plugin-example",`,
        ` ...`,
        `}`,
      ].join('\n'),
    ];
  }

  if (packageJson.$schema != pluginPackageJsonSchemaUrl) {
    return [
      [
        `.$schema should point to a supported schema. Currently supported schemas:`,
        `- ${pluginPackageJsonSchemaUrl}`,
      ].join('\n'),
    ];
  }

  const packageJsonSchema = await fs.readJson(packageJsonSchemaPath);
  const pluginPackageJsonSchema = await fs.readJson(
    pluginPackageJsonSchemaPath,
  );
  const ajv = new Ajv({
    allErrors: true,
    loadSchema,
    schemaId: 'auto',
    meta: true,
    jsonPointers: true,
  });
  require('ajv-errors')(ajv);
  ajv
    .addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'))
    .addSchema(packageJsonSchema, packageJsonSchemaUrl)
    .addSchema(pluginPackageJsonSchema, pluginPackageJsonSchemaUrl)
    .addKeyword('filePathExists', filePathExists(inputDirectory));

  const validate = await ajv.compileAsync(pluginPackageJsonSchema);
  const valid = await validate(packageJson);
  if (!valid) {
    return validate.errors
      ? validate.errors.map(
          (error) =>
            `${error.dataPath === '' ? '.' : error.dataPath} ${
              error.message || 'unspecified error'
            }`,
        )
      : [];
  }
  return null;
}

async function loadSchema(_uri: string) {
  return false;
}
