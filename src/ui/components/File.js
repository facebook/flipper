/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';

const React = require('react');
const fs = require('fs');

type FileProps = {|
  src: string,
  buffer?: ?string,
  encoding: string,
  onError?: (err: Error) => React.Element<*>,
  onLoading?: () => React.Element<*>,
  onData?: (content: string) => void,
  onLoad: (content: string) => React.Element<*>,
|};

type FileState = {|
  error: ?Error,
  loaded: boolean,
  content: string,
|};

export default class File extends Component<FileProps, FileState> {
  constructor(props: FileProps, context: Object) {
    super(props, context);
    this.state = {
      content: props.buffer || '',
      error: null,
      loaded: props.buffer != null,
    };
  }

  static defaultProps = {
    encoding: 'utf8',
  };

  componentWillReceiveProps(nextProps: FileProps) {
    if (nextProps.buffer != null) {
      this.setState({content: nextProps.buffer, loaded: true});
    }
  }

  componentDidMount() {
    if (this.state.loaded) {
      return;
    }

    fs.readFile(this.props.src, this.props.encoding, (err, content) => {
      if (err) {
        this.setState({error: err});
        return;
      }

      this.setState({content, loaded: true});

      if (this.props.onData) {
        this.props.onData(content);
      }
    });
  }

  render() {
    const {onError, onLoad, onLoading} = this.props;
    const {content, error, loaded} = this.state;

    if (error && onError) {
      return onError(error);
    } else if (loaded) {
      return onLoad(content);
    } else if (onLoading) {
      return onLoading();
    } else {
      return null;
    }
  }
}
