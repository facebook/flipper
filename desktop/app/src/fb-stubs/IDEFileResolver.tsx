/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export enum IDEType {
  'DIFFUSION',
  'AS',
  'VSCODE',
  'XCODE',
}

export abstract class IDEFileResolver {
  static async resolveFullPathsFromMyles(
    _fileName: string,
    _dirRoot: string,
  ): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  static openInIDE(
    _filePath: string,
    _ide: IDEType,
    _repo: string,
    _lineNumber = 0,
  ) {
    throw new Error('Method not implemented.');
  }

  static async getLithoComponentPath(_className: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  static getBestPath(
    _paths: string[],
    _className: string,
    _extension?: string,
  ): string {
    throw new Error('Method not implemented.');
  }
}
