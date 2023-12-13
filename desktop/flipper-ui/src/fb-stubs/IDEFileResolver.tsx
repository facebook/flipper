/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ElementFramework} from '../ui/components/elements-inspector/ElementFramework';
import {ElementsInspectorElement} from 'flipper-plugin';

export enum IDEType {
  'DIFFUSION',
  'AS',
  'XCODE',
  'VSCODE',
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

  static async getCKComponentPath(_className: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  static getBestPath(
    _paths: string[],
    _className: string,
    _extension?: string,
  ): string {
    throw new Error('Method not implemented.');
  }

  static async resolvePath(
    _className: string,
    _framework: string,
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }

  static isElementFromFramework(
    _node: ElementsInspectorElement,
    _framework: ElementFramework,
  ): boolean {
    throw new Error('Method not implemented.');
  }

  static isElementFromSupportedFramework(
    _node: ElementsInspectorElement,
  ): boolean {
    throw new Error('Method not implemented.');
  }
}
