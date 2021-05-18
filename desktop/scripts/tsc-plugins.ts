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
import {exec} from 'child_process';
import {EOL} from 'os';
import pmap from 'p-map';
import {rootDir} from './paths';
import yargs from 'yargs';
import {isPluginJson} from 'flipper-plugin-lib';

const argv = yargs
  .usage('yarn tsc-plugins [args]')
  .version(false)
  .options({
    dir: {
      description: 'Plugins directory name ("plugins" by default)',
      type: 'string',
      default: 'plugins',
      alias: 'd',
    },
  })
  .help()
  .strict()
  .parse(process.argv.slice(1));

const pluginsDir = path.join(rootDir, argv.dir);
const fbPluginsDir = path.join(pluginsDir, 'fb');
const publicPluginsDir = path.join(pluginsDir, 'public');

async function tscPlugins(): Promise<number> {
  const stdout = await new Promise<string | undefined>((resolve) =>
    exec(
      `./node_modules/.bin/tsc -p ./${argv.dir}/tsconfig.json`,
      {
        cwd: rootDir,
      },
      (err, stdout) => {
        if (err) {
          console.error(err);
          resolve(stdout);
        } else {
          resolve(undefined);
        }
      },
    ),
  );
  if (stdout) {
    console.error(stdout);
  }
  const errors = (stdout?.split(EOL) ?? []).filter((l) => l !== '');
  if (errors.length > 0) {
    await findAffectedPlugins(errors);
  }
  return stdout ? 1 : 0;
}

async function findAffectedPlugins(errors: string[]) {
  const [publicPackages, fbPackages] = await Promise.all([
    fs.readdir(publicPluginsDir),
    fs.readdir(fbPluginsDir).catch(() => [] as string[]),
  ]);
  const allPackages = await pmap(
    [
      ...publicPackages.map((p) => path.join(publicPluginsDir, p)),
      ...fbPackages.map((p) => path.join(fbPluginsDir, p)),
    ],
    async (p) => ({
      dir: p,
      json: await fs
        .readJson(path.join(p, 'package.json'))
        .catch(() => undefined),
    }),
  ).then((dirs) => dirs.filter((dir) => !!dir.json));
  const packageByName = new Map(
    allPackages.map((p) => [p.json.name as string, p]),
  );
  const depsByName = new Map<string, Set<string>>();
  function getDependencies(name: string): Set<string> {
    if (!depsByName.has(name)) {
      const set = new Set<string>();
      const pkg = packageByName.get(name)!;
      set.add(name);
      const allDeps = Object.keys({
        ...(pkg.json.dependencies ?? {}),
        ...(pkg.json.peerDependencies ?? {}),
      });
      for (const dep of allDeps) {
        if (packageByName.get(dep)) {
          const subDeps = getDependencies(dep);
          for (const subDep of subDeps) {
            set.add(subDep);
          }
        }
      }
      depsByName.set(name, set);
    }
    return depsByName.get(name)!;
  }
  for (const name of packageByName.keys()) {
    depsByName.set(name, getDependencies(name));
  }
  for (const pkg of allPackages) {
    if (!isPluginJson(pkg.json)) {
      continue;
    }
    const logFile = path.join(pkg.dir, 'tsc-error.log');
    await fs.remove(logFile);
    let logStream: fs.WriteStream | undefined;
    for (const dep of depsByName.get(pkg.json.name)!) {
      const relativeDir = path.relative(rootDir, packageByName.get(dep)!.dir);
      for (const error of errors) {
        if (error.startsWith(relativeDir)) {
          if (!logStream) {
            logStream = fs.createWriteStream(logFile);
            console.error(
              `Plugin ${path.relative(
                rootDir,
                pkg.dir,
              )} has tsc errors. Check ${path.relative(
                rootDir,
                logFile,
              )} for details.`,
            );
          }
          logStream.write(error);
          logStream.write(EOL);
        }
      }
    }
    logStream?.close();
  }
}

tscPlugins()
  .then((code) => {
    process.exit(code);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });
