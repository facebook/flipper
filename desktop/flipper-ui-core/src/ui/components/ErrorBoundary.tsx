/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CodeBlock} from 'flipper-plugin';
import {Component, ErrorInfo} from 'react';
import Heading from './Heading';
import Button from './Button';
import View from './View';
import styled from '@emotion/styled';
import React from 'react';
import StackTrace from 'stacktrace-js';

const ErrorBoundaryContainer = styled(View)({
  overflow: 'auto',
  padding: 10,
});
ErrorBoundaryContainer.displayName = 'ErrorBoundary:ErrorBoundaryContainer';

const ErrorBoundaryStack = styled(CodeBlock)({
  marginBottom: 10,
  whiteSpace: 'pre',
});
ErrorBoundaryStack.displayName = 'ErrorBoundary:ErrorBoundaryStack';

type ErrorBoundaryProps = {
  /** Function to dynamically generate the heading of the ErrorBox. */
  buildHeading?: (err: Error) => string;
  /** Heading of the ErrorBox. Used as an alternative to `buildHeading`. */
  heading?: string;
  /** Whether the stacktrace of the error is shown in the error box */
  showStack?: boolean;
  /** Code that might throw errors that will be catched */
  children?: React.ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null | undefined;
  mappedStack: string | null;
};

/**
 * Boundary catching errors and displaying an ErrorBlock instead.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps, context: Object) {
    super(props, context);
    this.state = {error: null, mappedStack: null};
  }

  componentDidCatch(err: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line flipper/no-console-error-without-context
    console.error(err, errorInfo.componentStack, 'ErrorBoundary');
    this.setState({error: err});
    // eslint-disable-next-line promise/no-promise-in-callback
    StackTrace.fromError(err)
      .then((frames) => {
        const mappedStack = frames.map((frame) => frame.toString()).join('\n');
        this.setState({error: err, mappedStack});
      })
      .catch((e) => {
        console.log('[stacktrace-js] failed to extract stack trace', e);
      });
  }

  clearError = () => {
    this.setState({error: null, mappedStack: null});
  };

  render() {
    const {error} = this.state;
    if (error) {
      const {buildHeading} = this.props;
      let {heading} = this.props;
      if (buildHeading) {
        heading = buildHeading(error);
      }
      if (heading == null) {
        heading = 'An error has occured';
      }

      return (
        <ErrorBoundaryContainer grow>
          <Heading>{heading}</Heading>
          {this.props.showStack !== false && (
            <ErrorBoundaryStack>
              {this.state.mappedStack ?? 'Loading stack trace...'}
            </ErrorBoundaryStack>
          )}
          <Button onClick={this.clearError}>Clear error and try again</Button>
        </ErrorBoundaryContainer>
      );
    } else {
      return this.props.children || null;
    }
  }
}
