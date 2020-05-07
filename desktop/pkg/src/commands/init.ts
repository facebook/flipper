/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Command} from '@oclif/command';
import {args} from '@oclif/parser';
import path from 'path';
import fs from 'fs-extra';
import recursiveReaddirImport from 'recursive-readdir';
import {promisify} from 'util';
import inquirer from 'inquirer';
const recursiveReaddir = promisify<string, string[]>(recursiveReaddirImport);

const templateDir = path.resolve(__dirname, '..', '..', 'templates', 'plugin');
const templateExt = '.template';

export default class Init extends Command {
  public static description =
    'initializes a Flipper desktop plugin template in the provided directory';

  public static examples = [`$ flipper-pkg init path/to/plugin`];

  public static args: args.IArg[] = [
    {
      name: 'directory',
      required: false,
      default: '.',
      description:
        'Path to the directory where the plugin package template should be initialized. Defaults to the current working directory.',
    },
  ];

  public async run() {
    const {args} = this.parse(Init);
    const outputDirectory: string = path.resolve(process.cwd(), args.directory);
    console.log(
      `⚙️  Initializing Flipper desktop template in ${outputDirectory}`,
    );
    const defaultID = path.basename(outputDirectory);
    const idQuestion: inquirer.QuestionCollection = [
      {
        type: 'input',
        name: 'id',
        message:
          'ID (must match native plugin ID, e.g. returned by getId() in Android plugin):',
        default: defaultID,
      },
    ];
    const id: string = (await inquirer.prompt(idQuestion)).id;
    const titleQuestion: inquirer.QuestionCollection = [
      {
        type: 'input',
        name: 'title',
        message: 'Title (will be shown in the Flipper main sidebar):',
        default: id,
      },
    ];
    const title: string = (await inquirer.prompt(titleQuestion)).title;
    const packageNameSuffix = id.toLowerCase().replace(' ', '-');
    const templateItems = await recursiveReaddir(templateDir);
    for (const item of templateItems) {
      const lstat = await fs.lstat(item);
      if (lstat.isFile()) {
        const file = path.relative(templateDir, item);
        const dir = path.dirname(file);
        const newDir = path.join(outputDirectory, dir);
        const newFile = file.endsWith('.template')
          ? path.join(
              outputDirectory,
              file.substring(0, file.length - templateExt.length),
            )
          : path.join(outputDirectory, file);
        await fs.ensureDir(newDir);
        const content = (await fs.readFile(item))
          .toString()
          .replace('{{id}}', id)
          .replace('{{title}}', title)
          .replace('{{package_name_suffix}}', packageNameSuffix);
        await fs.writeFile(newFile, content);
      }
    }
    console.log(
      `✅  Plugin template initialized. Package name: flipper-plugin-${packageNameSuffix}.`,
    );
  }
}
