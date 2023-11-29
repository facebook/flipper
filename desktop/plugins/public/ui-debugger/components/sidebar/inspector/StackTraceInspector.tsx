/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
// eslint-disable-next-line rulesdir/no-restricted-imports-clone
import {StackTrace} from 'flipper';
import {Tag} from '../../../ClientTypes';

const FacebookLibraries = ['Facebook'];
const CKFilter = ['UIDCKAnalyticsListener'];

const REGEX =
  /\d+\s+(?<library>[\s\w\.]+\w)\s+(?<address>0x\w+?)\s+(?<caller>.+) \+ (?<lineNumber>\d+)/;

function isSystemLibrary(libraryName: string | null | undefined): boolean {
  return libraryName ? !FacebookLibraries.includes(libraryName) : false;
}

type Props = {
  stacktrace: string[];
  tags: Tag[];
};
export const StackTraceInspector: React.FC<Props> = ({stacktrace, tags}) => {
  const filters = tags.includes('CK') ? CKFilter : [];
  return (
    <StackTrace>
      {stacktrace
        ?.filter((line) => filters.every((filter) => !line.includes(filter)))
        .map((line) => {
          const trace = REGEX.exec(line)?.groups;
          return {
            bold: !isSystemLibrary(trace?.library),
            library: trace?.library,
            address: trace?.address,
            caller: trace?.caller,
            lineNumber: trace?.lineNumber,
          };
        }) ?? [{caller: 'No stacktrace available'}]}
    </StackTrace>
  );
};
