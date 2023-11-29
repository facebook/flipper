/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import semver from 'semver';
import fg from 'fast-glob';

/**
 * Lists all dependencies that DO NOT have to match their type declaration package major versions
 *
 * Leave a comment for packages that you list here
 */
const IGNORED_TYPES = new Set(
  [
    // node is not an installed package
    'node',

    // we are useing experimental versions of these packages
    'react',
    'react-dom',
    'react-test-renderer',

    // these packages do not have new major versions
    'async',
    'dateformat',
    'deep-equal',
    'inquirer',
    'mock-fs',
    'npm-packlist',
  ].map((x) => `@types/${x}`),
);

type UnmatchedLibType = {
  types: readonly [string, string];
  lib: readonly [string, string];
};

type PackageJsonResult = {
  packageJson: string;
  unmatchedTypesPackages: UnmatchedLibType[];
};

function isValidTypesPackageName(x: [name: string, version: string]): boolean {
  return x[0].startsWith('@types/') && !IGNORED_TYPES.has(x[0]);
}

async function validatePackageJson(
  filepath: string,
): Promise<PackageJsonResult> {
  try {
    const jsonBuf = await fs.promises.readFile(filepath);
    const json = JSON.parse(jsonBuf.toString());
    const deps: Record<string, string> = json.dependencies || {};
    const devDeps: Record<string, string> = json.devDependencies || {};
    const typesPackages: Array<[string, string]> = [
      ...Object.entries(deps).filter(isValidTypesPackageName),
      ...Object.entries(devDeps).filter(isValidTypesPackageName),
    ];

    const unmatchedTypesPackages: UnmatchedLibType[] = typesPackages
      .map(([rawName, rawVersion]) => {
        const name: string | void = rawName.split('/', 2).pop();
        if (name == null) {
          throw new Error(
            `Could not infer package name from types "${rawName}"`,
          );
        }
        const typeVersionParsed = parsePackageVersion(
          rawVersion,
          rawName,
          filepath,
        );

        const depsWithLib = name in deps ? deps : devDeps || {};
        if (depsWithLib[name] == null) {
          return null;
        }

        const targetVersion = parsePackageVersion(
          depsWithLib[name],
          name,
          filepath,
        );
        if (targetVersion.major !== typeVersionParsed.major) {
          return {
            types: [rawName, rawVersion] as const,
            lib: [name, depsWithLib[name]] as const,
          };
        }
      })
      .filter(<T,>(x: T | undefined | null): x is T => x != null);

    return {
      packageJson: filepath,
      unmatchedTypesPackages,
    };
  } catch (e) {
    console.error(`Failed to parse ${filepath}`);
    throw e;
  }
}

async function main() {
  const packageJsons = await fg('**/package.json', {
    ignore: ['**/node_modules'],
  });

  const unmatched = await Promise.all(
    packageJsons.map(validatePackageJson),
  ).then((x) => x.filter((x) => x.unmatchedTypesPackages.length > 0));

  if (unmatched.length === 0) {
    console.log('No issues found');
    return;
  }

  console.log(
    unmatched
      .map((x) =>
        [
          x.packageJson,
          ...x.unmatchedTypesPackages.map(
            (x: UnmatchedLibType) =>
              `\t${x.types[0]}: ${x.types[1]} --- ${x.lib[0]}: ${x.lib[1]}`,
          ),
        ].join('\n'),
      )
      .join('\n'),
  );

  process.exit(1);
}

main().catch((e) => {
  console.log(`Unexpected error: ${e}`);
  process.exit(1);
});

function parsePackageVersion(
  version: string,
  pkgName: string,
  filepath: string,
): semver.SemVer {
  // versions can start with ~ or ^
  if (!version.match(/^\d/)) {
    version = version.slice(1);
  }
  const parsed = semver.parse(version);
  if (parsed == null) {
    throw new Error(
      `Could not parse version number from "${version}" for package "${pkgName}" in ${filepath}`,
    );
  }

  return parsed;
}
