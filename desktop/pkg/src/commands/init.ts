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
import {spawnSync} from 'child_process';
import recursiveReaddirImport from 'recursive-readdir';
import {promisify} from 'util';
import inquirer from 'inquirer';
import {homedir} from 'os';

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
    const pluginDirectory: string = path.resolve(process.cwd(), args.directory);
    await verifyFlipperSearchPath(pluginDirectory);

    const idQuestion: inquirer.QuestionCollection = [
      {
        type: 'input',
        name: 'id',
        message:
          'ID (must match native plugin ID, e.g. returned by getId() in Android plugin):',
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
    const packageName = getPackageNameFromId(id);
    const outputDirectory = path.join(pluginDirectory, packageName);

    if (fs.existsSync(outputDirectory)) {
      console.error(`Directory '${outputDirectory}' already exists`);
      process.exit(1);
    }
    console.log(
      `⚙️  Initializing Flipper desktop template in ${outputDirectory}`,
    );
    await fs.ensureDir(outputDirectory);
    await initTemplate(id, title, outputDirectory);

    console.log(`⚙️  Installing dependencies`);
    spawnSync('yarn', ['install'], {cwd: outputDirectory, stdio: [0, 1, 2]});

    console.log(
      `✅  Plugin directory initialized. Package name: ${packageName}.`,
    );
    console.log(
      `   Run 'cd ${packageName} && yarn watch' to get started! You might need to restart Flipper before the new plugin is detected.`,
    );
  }
}

function getPackageNameFromId(id: string): string {
  return 'flipper-plugin-' + id.toLowerCase().replace(/[^a-zA-Z0-9\-_]+/g, '-');
}

export async function initTemplate(
  id: string,
  title: string,
  outputDirectory: string,
) {
  const packageName = getPackageNameFromId(id);
  const templateItems = await recursiveReaddir(templateDir);

  for (const item of templateItems) {
    const lstat = await fs.lstat(item);
    if (lstat.isFile()) {
      const file = path.relative(templateDir, item);
      const dir = path.dirname(file);
      const newDir = path.join(outputDirectory, dir);
      const newFile = file.endsWith(templateExt)
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
        .replace('{{package_name}}', packageName);
      await fs.writeFile(newFile, content);
    }
  }
}

async function verifyFlipperSearchPath(pluginDirectory: string) {
  const flipperConfigPath = path.join(homedir(), '.flipper', 'config.json');
  if (!fs.existsSync(flipperConfigPath)) {
    console.warn(
      `It seems Flipper is not installed on your machine; failed to find ${flipperConfigPath}. Head to 'fbflipper.com' to download flipper`,
    );
  } else {
    const config = JSON.parse(fs.readFileSync(flipperConfigPath, 'utf8'));
    const pluginPaths: string[] = config.pluginPaths ?? [];
    const isInSearchPath = pluginPaths.some(
      (p) => pluginDirectory === path.resolve(p.replace(/^~/, homedir())),
    );
    if (!isInSearchPath) {
      if (
        (
          await inquirer.prompt([
            {
              type: 'confirm',
              name: 'addToPath',
              message: `You are about to create a plugin in a directory that isn't watched by Flipper. Should we add ${pluginDirectory} to the Flipper search path? (Ctrl^C to abort)`,
              default: true,
            },
          ])
        ).addToPath
      ) {
        fs.writeFileSync(
          flipperConfigPath,
          JSON.stringify(
            {
              ...config,
              pluginPaths: [...pluginPaths, pluginDirectory],
            },
            null,
            2,
          ),
          'utf8',
        );
        console.log(
          `⚙️  Added '${pluginDirectory}' to the search paths in '${flipperConfigPath}'`,
        );
      }
    }
  }
}
