/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlexColumn,
  styled,
  Text,
  FlexRow,
  Input,
  colors,
  Glyph,
} from '../../ui';
import React, {useState, useEffect} from 'react';
import {getFlipperLib, theme} from 'flipper-plugin';

export const ConfigFieldContainer = styled(FlexRow)({
  paddingLeft: 10,
  paddingRight: 10,
  marginBottom: 5,
  paddingTop: 5,
});

export const InfoText = styled(Text)({
  lineHeight: 1.35,
  paddingTop: 5,
});

const FileInputBox = styled(Input)<{isValid: boolean}>(({isValid}) => ({
  marginRight: 0,
  flexGrow: 1,
  fontFamily: 'monospace',
  color: isValid ? undefined : colors.red,
  marginLeft: 10,
  marginTop: 'auto',
  marginBottom: 'auto',
}));

const SelectBox = styled.select<{isValid: boolean}>(({isValid}) => ({
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

const GrayedOutOverlay = styled.div({
  backgroundColor: '#EFEEEF',
  borderRadius: 4,
  opacity: 0.6,
  height: '100%',
  position: 'absolute',
  left: 0,
  right: 0,
});

export function ComboBoxConfigField(props: {
  label: string;
  resetValue?: string;
  options: {id: string; name: string}[];
  defaultValue: string;
  onChange: (path: string) => void;
}) {
  let defaultOption = props.options.find(
    (opt) => opt.id === props.defaultValue,
  );
  const resetOption = props.options.find((opt) => opt.id === props.resetValue);
  const [value, setValue] = useState(defaultOption?.id);

  // If there is no valid default value, force setting the value to the first one
  if (!value) {
    defaultOption = props.options[0];
    props.onChange(defaultOption.id);
    setValue(defaultOption.id);
  }

  return (
    <ConfigFieldContainer>
      <InfoText>{props.label}</InfoText>
      <SelectBox
        name="select"
        isValid={props.options.some((opt) => opt.id === value)}
        value={value}
        onChange={(event) => {
          props.onChange(event.target.value);
          setValue(props.options[event.target.selectedIndex].id);
        }}>
        {props.options.map((option) => {
          return (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          );
        })}
      </SelectBox>
      {resetOption && (
        <FlexColumn
          title={`Reset to default ${props.resetValue}`}
          onClick={() => {
            props.onChange(props.resetValue!);
            setValue(props.resetValue!);
          }}>
          <CenteredGlyph
            color={theme.primaryColor}
            name="undo"
            variant="outline"
          />
        </FlexColumn>
      )}
      {props.options.some((opt) => opt.id === value) ? null : (
        <CenteredGlyph name="caution-triangle" color={colors.yellow} />
      )}
    </ConfigFieldContainer>
  );
}

export function FilePathConfigField(props: {
  label: string;
  resetValue?: string;
  defaultValue: string;
  onChange: (path: string) => void;
  frozen?: boolean;
  // Defaults to allowing directories only, this changes to expect regular files.
  isRegularFile?: boolean;
}) {
  const [value, setValue] = useState(props.defaultValue);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    (async function () {
      try {
        const stat = await getFlipperLib().remoteServerContext.fs.stat(value);
        setIsValid(props.isRegularFile !== stat.isDirectory);
      } catch (_) {
        setIsValid(false);
      }
    })();
  }, [props.isRegularFile, value]);

  return (
    <ConfigFieldContainer>
      <InfoText>{props.label}</InfoText>
      <FileInputBox
        placeholder={props.label}
        value={value}
        isValid={isValid}
        onChange={(e) => {
          setValue(e.target.value);
          props.onChange(e.target.value);
          getFlipperLib()
            .remoteServerContext.fs.stat(e.target.value)
            .then((stat) => stat.isDirectory)
            .then((valid) => {
              if (valid !== isValid) {
                setIsValid(valid);
              }
            })
            .catch((_) => setIsValid(false));
        }}
      />
      {props.resetValue && (
        <FlexColumn
          title={`Reset to default path ${props.resetValue}`}
          onClick={() => {
            setValue(props.resetValue!);
            props.onChange(props.resetValue!);
          }}>
          <CenteredGlyph
            color={theme.primaryColor}
            name="undo"
            variant="outline"
          />
        </FlexColumn>
      )}
      {isValid ? null : (
        <CenteredGlyph name="caution-triangle" color={colors.yellow} />
      )}
      {props.frozen && <GrayedOutOverlay />}
    </ConfigFieldContainer>
  );
}

export function ConfigText(props: {content: string; frozen?: boolean}) {
  return (
    <ConfigFieldContainer>
      <InfoText>{props.content}</InfoText>
      {props.frozen && <GrayedOutOverlay />}
    </ConfigFieldContainer>
  );
}

export function URLConfigField(props: {
  label: string;
  resetValue?: string;
  defaultValue: string;
  onChange: (path: string) => void;
  frozen?: boolean;
}) {
  const [value, setValue] = useState(props.defaultValue);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    try {
      const url = new URL(value);
      const isValidUrl =
        ['http:', 'https:'].includes(url.protocol) &&
        url.href.startsWith(value);
      setIsValid(isValidUrl);
    } catch (_) {
      setIsValid(false);
    }
  }, [value]);

  return (
    <ConfigFieldContainer>
      <InfoText>{props.label}</InfoText>
      <FileInputBox
        placeholder={props.label}
        value={value}
        isValid={isValid}
        onChange={(e) => {
          setValue(e.target.value);
          props.onChange(e.target.value);
        }}
      />

      {props.resetValue && (
        <FlexColumn
          title={`Reset to default value ${props.resetValue}`}
          onClick={() => {
            setValue(props.resetValue!);
            props.onChange(props.resetValue!);
          }}>
          <CenteredGlyph
            color={theme.primaryColor}
            name="undo"
            variant="outline"
          />
        </FlexColumn>
      )}
      {isValid ? null : (
        <CenteredGlyph name="caution-triangle" color={colors.yellow} />
      )}
      {props.frozen && <GrayedOutOverlay />}
    </ConfigFieldContainer>
  );
}
