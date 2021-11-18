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
import styled from '@emotion/styled';
import {colors} from './colors';
import fs from 'fs';
import {Tooltip} from '..';
import {getFlipperLib} from 'flipper-plugin';

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

export interface Props {
  onPathChanged: (evtArgs: {path: string; isValid: boolean}) => void;
  placeholderText: string;
  defaultPath: string;
}

const defaultProps: Props = {
  onPathChanged: (_) => {},
  placeholderText: '',
  defaultPath: '/',
};

// TODO: Should we render null in browsers for FileSelector?
// Do we even need it after decapitation? Every plugin should be using FlipperLib.exportFile which shows a save dialog every time.
export default function FileSelector({
  onPathChanged,
  placeholderText,
  defaultPath,
}: Props) {
  const [value, setValue] = useState('');
  const [isValid, setIsValid] = useState(false);
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
          getFlipperLib()
            .showOpenDialog?.({defaultPath})
            .then((path) => {
              if (path) {
                onChange(path);
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
