/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {
  CSSProperties,
  DragEventHandler,
  KeyboardEventHandler,
  useState,
} from 'react';
import {Button, Input, Row, Col, Tooltip} from 'antd';
import {
  CloseOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  FileDescriptor,
  FileEncoding,
  FlipperLib,
  getFlipperLib,
} from '../plugin/FlipperLib';
import {fromUint8Array} from 'js-base64';
import {assertNever} from 'flipper-common';

export type FileSelectorProps = {
  /**
   * Placeholder text displayed in the Input when it is empty
   */
  label: string;
  /**
   * List of allowed file extentions
   */
  extensions?: string[];
  required?: boolean;
  className?: string;
  style?: CSSProperties;
  /**
   * Imported file encoding. Default: UTF-8.
   */
  encoding?: FileEncoding;
} & (
  | {
      multi?: false;
      onChange: (newFile?: FileDescriptor) => void;
    }
  | {
      multi: true;
      onChange: (newFiles: FileDescriptor[]) => void;
    }
);

const formatFileDescriptor = (fileDescriptor?: FileDescriptor) =>
  fileDescriptor?.path || fileDescriptor?.name;

export function FileSelector({
  onChange,
  label,
  extensions,
  required,
  className,
  style,
  encoding = 'utf-8',
  multi,
}: FileSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileDescriptor[]>([]);

  const onSetFiles = async () => {
    setLoading(true);

    let defaultPath: string | undefined = files[0]?.path ?? files[0]?.name;
    if (multi) {
      defaultPath = files[0]?.path;
    }

    try {
      const newFileSelection = await getFlipperLib().importFile?.({
        defaultPath,
        extensions,
        title: label,
        encoding,
        multi,
      } as Parameters<FlipperLib['importFile']>[0]);

      if (!newFileSelection) {
        return;
      }

      if (Array.isArray(newFileSelection)) {
        if (!newFileSelection.length) {
          return;
        }

        setFiles(newFileSelection);
        (onChange as (newFiles: FileDescriptor[]) => void)(newFileSelection);
      } else {
        setFiles([newFileSelection]);
        (onChange as (newFiles?: FileDescriptor) => void)(newFileSelection);
      }
    } catch (e) {
      console.error('FileSelector.onSetFile -> error', label, e);
    } finally {
      setLoading(false);
    }
  };

  const onFilesDrop: DragEventHandler<HTMLElement> = async (e) => {
    setLoading(true);

    try {
      if (!e.dataTransfer.files.length) {
        return;
      }

      const droppedFiles = multi
        ? Array.from(e.dataTransfer.files)
        : [e.dataTransfer.files[0]];

      const droppedFileSelection = await Promise.all(
        droppedFiles.map(async (droppedFile) => {
          const raw = await droppedFile.arrayBuffer();

          let data: string;
          switch (encoding) {
            case 'utf-8': {
              data = new TextDecoder().decode(raw);
              break;
            }
            case 'base64': {
              data = fromUint8Array(new Uint8Array(raw));
              break;
            }
            default: {
              assertNever(encoding);
            }
          }

          const droppedFileDescriptor: FileDescriptor = {
            data: data!,
            name: droppedFile.name,
            // Electron "File" has "path" attribute
            path: (droppedFile as any).path,
          };
          return droppedFileDescriptor;
        }),
      );

      setFiles(droppedFileSelection);
      if (multi) {
        (onChange as (newFiles: FileDescriptor[]) => void)(
          droppedFileSelection,
        );
      } else {
        (onChange as (newFiles?: FileDescriptor) => void)(
          droppedFileSelection[0],
        );
      }
    } catch (e) {
      console.error('FileSelector.onFileDrop -> error', label, e);
    } finally {
      setLoading(false);
    }
  };

  const captureEnterPress: KeyboardEventHandler<HTMLElement> = (e) => {
    if (e.key === 'Enter') {
      onSetFiles();
    }
  };

  const emptyFileListEventHandlers = !files.length
    ? {onClick: onSetFiles, onKeyUp: captureEnterPress}
    : {};

  const inputProps = {
    placeholder: label,
    disabled: loading,
    onDrop: onFilesDrop,
    ...emptyFileListEventHandlers,
  };

  return (
    <Row
      gutter={8}
      align="middle"
      wrap={false}
      className={className}
      style={style}>
      <Col flex="auto">
        {multi ? (
          <Input.TextArea
            {...inputProps}
            value={
              loading
                ? 'Loading...'
                : files.map(formatFileDescriptor).join('; ')
            }
          />
        ) : (
          <Input
            {...inputProps}
            value={loading ? 'Loading...' : formatFileDescriptor(files[0])}
          />
        )}
      </Col>
      {required && !files.length ? (
        <Tooltip title="Required!">
          <Col flex="none">
            <ExclamationCircleOutlined />
          </Col>
        </Tooltip>
      ) : null}
      <Col flex="none">
        <Button
          icon={<CloseOutlined />}
          title="Reset"
          disabled={!files.length || loading}
          onClick={() => setFiles([])}
        />
      </Col>
      <Col flex="none">
        <Button
          icon={<UploadOutlined />}
          onClick={onSetFiles}
          disabled={loading}
          title={label}
        />
      </Col>
    </Row>
  );
}
