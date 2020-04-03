/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {Component} from 'react';
import fs from 'fs';

type FileProps = {
  /** Path to the file in the file system */
  src: string;
  /** Initial content that should be shown while the file is loading */
  buffer?: string | null | undefined;
  /** Encoding to parse the contents of the file. Defaults to UTF-8. */
  encoding: string;
  /** Content that should be rendered, when the file loading failed. */
  onError?: (err: Error) => React.ReactNode;
  /** Content that should be rendered, while the file is loaded. */
  onLoading?: () => React.ReactNode;
  /** Callback when the data is successfully loaded. */
  onData?: (content: string) => void;
  /** Content that should be rendered, when the file is successfully loaded. This ususally should render the file's contents. */
  onLoad: (content: string) => React.ReactNode;
};

type FileState = {
  error: Error | null | undefined;
  loaded: boolean;
  content: string;
};

/**
 * Wrapper for loading file content from the file system.
 */
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

  static getDerivedStateFromProps(nextProps: FileProps) {
    if (nextProps.buffer != null) {
      return {content: nextProps.buffer, loaded: true};
    }
    return null;
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
