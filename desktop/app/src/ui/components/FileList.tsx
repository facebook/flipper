/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Component} from 'react';
import path from 'path';
import fs from 'fs';

const EMPTY_MAP = new Map();
const EMPTY_FILE_LIST_STATE = {error: null, files: EMPTY_MAP};

export type FileListFileType = 'file' | 'folder';

export type FileListFile = {
  name: string;
  src: string;
  type: FileListFileType;
  size: number;
  mtime: number;
  atime: number;
  ctime: number;
  birthtime: number;
};

export type FileListFiles = Array<FileListFile>;

type FileListProps = {
  /** Path to the folder */
  src: string;
  /** Content to be rendered in case of an error */
  onError?: (err: Error) => React.ReactNode | null | undefined;
  /** Content to be rendered while loading */
  onLoad?: () => void;
  /** Content to be rendered when the file list is loaded */
  onFiles: (files: FileListFiles) => React.ReactNode;
};

type FileListState = {
  files: Map<string, FileListFile>;
  error: Error | null | undefined;
};

/**
 * List the contents of a folder from the user's file system. The file system is watched for
 * changes and this list will automatically update.
 */
export default class FileList extends Component<FileListProps, FileListState> {
  constructor(props: FileListProps, context: Object) {
    super(props, context);
    this.state = EMPTY_FILE_LIST_STATE;
  }

  watcher: fs.FSWatcher | null | undefined;

  fetchFile(src: string, name: string): Promise<FileListFile> {
    return new Promise((resolve, reject) => {
      const loc = path.join(src, name);

      fs.lstat(loc, (err, stat) => {
        if (err) {
          reject(err);
        } else {
          const details: FileListFile = {
            atime: Number(stat.atime),
            birthtime:
              typeof stat.birthtime === 'object' ? Number(stat.birthtime) : 0,
            ctime: Number(stat.ctime),
            mtime: Number(stat.mtime),
            name,
            size: stat.size,
            src: loc,
            type: stat.isDirectory() ? 'folder' : 'file',
          };
          resolve(details);
        }
      });
    });
  }

  fetchFilesFromFolder(
    originalSrc: string,
    currentSrc: string,
    callback: Function,
  ) {
    const hasChangedDir = () => this.props.src !== originalSrc;

    let filesSet: Map<string, FileListFile> = new Map();
    fs.readdir(currentSrc, (err, files) => {
      if (err) {
        return callback(err, EMPTY_MAP);
      }
      let remainingPaths = files.length;

      const next = () => {
        if (hasChangedDir()) {
          return callback(null, EMPTY_MAP);
        }

        if (!remainingPaths) {
          return callback(null, filesSet);
        }

        const name = files.shift();
        if (name) {
          this.fetchFile(currentSrc, name)
            .then((data) => {
              filesSet.set(name, data);
              if (data.type == 'folder') {
                this.fetchFilesFromFolder(
                  originalSrc,
                  path.join(currentSrc, name),
                  function (err: Error, files: Map<string, FileListFile>) {
                    if (err) {
                      return callback(err, EMPTY_MAP);
                    }
                    filesSet = new Map([...filesSet, ...files]);
                    remainingPaths--;
                    if (!remainingPaths) {
                      return callback(null, filesSet);
                    }
                  },
                );
              } else {
                remainingPaths--;
              }
              next();
            })
            .catch((err) => {
              return callback(err, EMPTY_MAP);
            });
        }
      };

      next();
    });
  }

  fetchFiles(callback?: Function) {
    const {src} = this.props;

    const setState = (data: FileListState) => {
      if (!hasChangedDir()) {
        this.setState(data);
      }
    };

    const hasChangedDir = () => this.props.src !== src;

    this.fetchFilesFromFolder(
      src,
      src,
      function (err: Error, files: Map<string, FileListFile>) {
        setState({error: err, files: files});
        if (callback) {
          callback();
        }
      },
    );
  }

  UNSAFE_componentWillReceiveProps(nextProps: FileListProps) {
    if (nextProps.src !== this.props.src) {
      this.initialFetch(nextProps);
    }
  }

  componentDidMount() {
    this.initialFetch(this.props);
  }

  componentWillUnmount() {
    this.removeWatcher();
  }

  initialFetch(props: FileListProps) {
    this.removeWatcher();

    fs.access(props.src, fs.constants.R_OK, (err) => {
      if (err) {
        this.setState({error: err, files: EMPTY_MAP});
        return;
      }

      this.fetchFiles(props.onLoad);

      this.watcher = fs.watch(props.src, () => {
        this.fetchFiles();
      });

      this.watcher.on('error', (err) => {
        this.setState({error: err, files: EMPTY_MAP});
        this.removeWatcher();
      });
    });
  }

  removeWatcher() {
    if (this.watcher) {
      this.watcher.close();
    }
  }

  render() {
    const {error, files} = this.state;
    const {onError, onFiles} = this.props;
    if (error && onError) {
      return onError(error);
    } else {
      return onFiles(Array.from(files.values()));
    }
  }
}
