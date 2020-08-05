/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export enum IDE {
  'DIFFUSION',
  'AS',
  'VSCODE',
  'XCODE',
}

export async function resolveFullPathsFromMyles(
  _fileName: string,
  _dirRoot: string,
): Promise<string[]> {
  throw new Error('Method not implemented.');
}

export function openInIDE(
  _filePath: string,
  _ide: IDE,
  _repo: string,
  _lineNumber = 0,
) {
  throw new Error('Method not implemented.');
}

export function getBestPath(_paths: string[], _className: string): string {
  throw new Error('Method not implemented.');
}
