/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {colors, StackTrace} from 'flipper';

const FacebookLibraries = ['Facebook'];

const REGEX = /\d+\s+(?<library>[\s\w\.]+\w)\s+(?<address>0x\w+?)\s+(?<caller>.+) \+ (?<lineNumber>\d+)/;

function isSystemLibrary(libraryName: string | null | undefined): boolean {
  return libraryName ? !FacebookLibraries.includes(libraryName) : false;
}

type Props = {
  data: Array<string>;
  skipStackTraceFormat?: boolean | undefined;
};

export default class extends React.Component<Props> {
  render() {
    if (this.props.skipStackTraceFormat) {
      return (
        <StackTrace backgroundColor={colors.white}>
          {this.props.data.map((stack_trace_line) => {
            return {
              caller: stack_trace_line,
            };
          })}
        </StackTrace>
      );
    }

    return (
      <StackTrace backgroundColor={colors.white}>
        {/* We need to filter out from the stack trace any reference to the plugin such that the information is more coincised and focused */}
        {this.props.data
          .filter((stack_trace_line) => {
            return !stack_trace_line.includes('FlipperKitSectionsPlugin');
          })
          .map((stack_trace_line) => {
            const trace = REGEX.exec(stack_trace_line)?.groups;
            return {
              bold: !isSystemLibrary(trace?.library),
              library: trace?.library,
              address: trace?.address,
              caller: trace?.caller,
              lineNumber: trace?.lineNumber,
            };
          })}
      </StackTrace>
    );
  }
}
