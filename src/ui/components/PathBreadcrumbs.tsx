/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ButtonGroup from './ButtonGroup';
import {Component} from 'react';
import Button from './Button';
import path from 'path';
import React from 'react';

class PathBreadcrumbsItem extends Component<{
  name: string;
  path: string;
  isFolder: boolean;
  onClick: (path: string) => void;
}> {
  onClick = () => {
    this.props.onClick(this.props.path);
  };

  render() {
    return <Button onClick={this.onClick}>{this.props.name}</Button>;
  }
}

export default function PathBreadcrumbs(props: {
  path: string;
  isFile?: boolean;
  onClick: (path: string) => void;
}) {
  const parts = props.path === path.sep ? [''] : props.path.split(path.sep);
  const {onClick} = props;

  return (
    <ButtonGroup>
      {parts.map((part, i) => {
        const fullPath = parts.slice(0, i + 1).join(path.sep) || path.sep;
        return (
          <PathBreadcrumbsItem
            key={`${i}:${part}`}
            name={part || fullPath}
            path={fullPath}
            isFolder={!(props.isFile === true && i === parts.length - 1)}
            onClick={onClick}
          />
        );
      })}
    </ButtonGroup>
  );
}
