/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {FlexColumn, styled, Text, FlexRow, Input, colors, Glyph} from 'flipper';
import React, {useState} from 'react';
import {promises as fs} from 'fs';
import {remote} from 'electron';
import path from 'path';

const ConfigFieldContainer = styled(FlexRow)({
  paddingLeft: 10,
  paddingRight: 10,
});

const InfoText = styled(Text)({
  lineHeight: 1.35,
  paddingTop: 5,
});

const FileInputBox = styled(Input)(({isValid}: {isValid: boolean}) => ({
  marginRight: 0,
  flexGrow: 1,
  fontFamily: 'monospace',
  color: isValid ? undefined : colors.red,
  marginLeft: 10,
  marginTop: 'auto',
  marginBottom: 'auto',
}));

const CenteredGlyph = styled(Glyph)({
  margin: 'auto',
  marginLeft: 10,
});

const GreyedOutOverlay = styled('div')({
  backgroundColor: '#EFEEEF',
  borderRadius: 4,
  opacity: 0.6,
  height: '100%',
  position: 'absolute',
  left: 0,
  right: 0,
});

export function FilePathConfigField(props: {
  label: string;
  defaultValue: string;
  onChange: (path: string) => void;
  frozen?: boolean;
}) {
  const [value, setValue] = useState(props.defaultValue);
  const [isValid, setIsValid] = useState(true);
  fs.stat(value)
    .then(stat => setIsValid(stat.isDirectory()))
    .catch(_ => setIsValid(false));

  return (
    <ConfigFieldContainer>
      <InfoText>{props.label}</InfoText>
      <FileInputBox
        placeholder={props.label}
        value={value}
        isValid={isValid}
        onChange={e => {
          setValue(e.target.value);
          props.onChange(e.target.value);
          fs.stat(e.target.value)
            .then(stat => setIsValid(stat.isDirectory()))
            .catch(_ => setIsValid(false));
        }}
      />
      <FlexColumn
        onClick={() =>
          remote.dialog.showOpenDialog(
            {
              properties: ['openDirectory', 'showHiddenFiles'],
              defaultPath: path.resolve('/'),
            },
            (paths: Array<string> | undefined) => {
              paths && setValue(paths[0]);
              paths && props.onChange(paths[0]);
            },
          )
        }>
        <CenteredGlyph name="dots-3-circle" variant="outline" />
      </FlexColumn>
      {isValid ? null : (
        <CenteredGlyph name="caution-triangle" color={colors.yellow} />
      )}
      {props.frozen && <GreyedOutOverlay />}
    </ConfigFieldContainer>
  );
}

export function ConfigText(props: {content: string; frozen?: boolean}) {
  return (
    <ConfigFieldContainer>
      <InfoText>{props.content}</InfoText>
      {props.frozen && <GreyedOutOverlay />}
    </ConfigFieldContainer>
  );
}
