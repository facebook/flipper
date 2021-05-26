/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState} from 'react';
import FlexRow from './FlexRow';
import Glyph from './Glyph';
import Input from './Input';
import electron from 'electron';
import styled from '@emotion/styled';
import {colors} from './colors';
import Electron from 'electron';
import fs from 'fs';
import {Tooltip} from '..';

const CenteredGlyph = styled(Glyph)({
  margin: 'auto',
  marginLeft: 4,
});

const Container = styled(FlexRow)({
  width: '100%',
  marginRight: 4,
});

const GlyphContainer = styled(FlexRow)({
  width: 20,
});

const FileInputBox = styled(Input)<{isValid: boolean}>(({isValid}) => ({
  flexGrow: 1,
  color: isValid ? undefined : colors.red,
  '&::-webkit-input-placeholder': {
    color: colors.placeholder,
    fontWeight: 300,
  },
}));

function strToArr<T extends string>(item: T): T[] {
  return [item];
}

export interface Props {
  onPathChanged: (evtArgs: {path: string; isValid: boolean}) => void;
  placeholderText: string;
  defaultPath: string;
  showHiddenFiles: boolean;
}

const defaultProps: Props = {
  onPathChanged: (_) => {},
  placeholderText: '',
  defaultPath: '/',
  showHiddenFiles: false,
};

export default function FileSelector({
  onPathChanged,
  placeholderText,

  defaultPath,
  showHiddenFiles,
}: Props) {
  const [value, setValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const options: Electron.OpenDialogOptions = {
    properties: [
      'openFile',
      ...(showHiddenFiles ? strToArr('showHiddenFiles') : []),
    ],
    defaultPath,
  };
  const onChange = (path: string) => {
    setValue(path);
    let isNewPathValid = false;
    try {
      isNewPathValid = fs.statSync(path).isFile();
    } catch {
      isNewPathValid = false;
    }
    setIsValid(isNewPathValid);
    onPathChanged({path, isValid: isNewPathValid});
  };
  return (
    <Container>
      <FileInputBox
        placeholder={placeholderText}
        value={value}
        isValid
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            onChange(e.dataTransfer.files[0].path);
          }
        }}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
      <GlyphContainer
        onClick={() =>
          electron.remote.dialog
            .showOpenDialog(options)
            .then((result: electron.OpenDialogReturnValue) => {
              if (result && !result.canceled && result.filePaths.length) {
                onChange(result.filePaths[0]);
              }
            })
        }>
        <CenteredGlyph
          name="dots-3-circle"
          variant="outline"
          title="Open file selection dialog"
        />
      </GlyphContainer>
      <GlyphContainer>
        {isValid ? null : (
          <Tooltip title="The specified path is invalid or such file does not exist">
            <CenteredGlyph
              name="caution-triangle"
              color={colors.yellow}
              size={16}
            />
          </Tooltip>
        )}
      </GlyphContainer>
    </Container>
  );
}

FileSelector.defaultProps = defaultProps;
