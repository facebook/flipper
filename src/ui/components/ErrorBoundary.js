/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import ErrorBlock from './ErrorBlock.js';
import {Component} from 'react';
import Heading from './Heading.js';
import Button from './Button.js';
import View from './View.js';
import styled from '../styled/index.js';

const ErrorBoundaryContainer = styled(View)({
  overflow: 'auto',
  padding: 10,
});

const ErrorBoundaryStack = styled(ErrorBlock)({
  marginBottom: 10,
  whiteSpace: 'pre',
});

type ErrorBoundaryProps = {
  /** Function to dynamically generate the heading of the ErrorBox. */
  buildHeading?: (err: Error) => string,
  /** Heading of the ErrorBox. Used as an alternative to `buildHeading`. */
  heading?: string,
  /** Whether the stacktrace of the error is shown in the error box */
  showStack?: boolean,
  /** Code that might throw errors that will be catched */
  children?: React$Node,
};

type ErrorBoundaryState = {|
  error: ?Error,
|};

/**
 * Boundary catching errors and displaying an ErrorBlock instead.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState,
> {
  constructor(props: ErrorBoundaryProps, context: Object) {
    super(props, context);
    this.state = {error: null};
  }

  componentDidCatch(err: Error) {
    console.error(err.toString(), 'ErrorBoundary');
    this.setState({error: err});
  }

  clearError = () => {
    this.setState({error: null});
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
        <ErrorBoundaryContainer grow={true}>
          <Heading>{heading}</Heading>
          {this.props.showStack !== false && (
            <ErrorBoundaryStack error={error} />
          )}
          <Button onClick={this.clearError}>Clear error and try again</Button>
        </ErrorBoundaryContainer>
      );
    } else {
      return this.props.children || null;
    }
  }
}
