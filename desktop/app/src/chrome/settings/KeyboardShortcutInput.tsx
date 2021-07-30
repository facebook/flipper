/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, styled, FlexRow, Text, Glyph, colors} from '../../ui';
import React, {useRef, useState, useEffect} from 'react';
import {theme} from 'flipper-plugin';

type PressedKeys = {
  metaKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  character: string;
};

const KEYCODES = {
  DELETE: 8,
  ALT: 18,
  SHIFT: 16,
  CTRL: 17,
  LEFT_COMMAND: 91, // Left ⌘ / Windows Key / Chromebook Search key
  RIGHT_COMMAND: 93, // Right ⌘ / Windows Menu
};

const ACCELERATORS = {
  COMMAND: 'Command',
  ALT: 'Alt',
  CONTROL: 'Control',
  SHIFT: 'Shift',
};

const Container = styled(FlexRow)({
  paddingTop: 5,
  paddingLeft: 10,
  paddingRight: 10,
  width: 343,
});

const Label = styled(Text)({
  alignSelf: 'center',
  width: 140,
});

const ShortcutKeysContainer = styled(FlexRow)<{invalid: boolean}>(
  {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 4,
    display: 'flex',
    height: 28,
    flexGrow: 1,
    padding: 2,
  },
  (props) => ({borderColor: props.invalid ? colors.red : colors.light15}),
);

const ShortcutKeyContainer = styled.div({
  border: `1px solid ${colors.light20}`,
  backgroundColor: theme.backgroundWash,
  padding: 3,
  margin: '0 1px',
  borderRadius: 3,
  width: 23,
  textAlign: 'center',
  boxShadow: `inset 0 -1px 0 ${colors.light20}`,
});

const ShortcutKey = styled.span({
  color: colors.dark70,
  verticalAlign: 'middle',
});

const HiddenInput = styled.input({
  opacity: 0,
  width: 0,
  height: 0,
  position: 'absolute',
});

const CenteredGlyph = styled(Glyph)({
  margin: 'auto',
  marginLeft: 10,
});

const KeyboardShortcutInput = (props: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
}) => {
  const getInitialStateFromProps = (): PressedKeys => ({
    metaKey: Boolean(props.value && props.value.includes(ACCELERATORS.COMMAND)),
    altKey: Boolean(props.value && props.value.includes(ACCELERATORS.ALT)),
    ctrlKey: Boolean(props.value && props.value.includes(ACCELERATORS.CONTROL)),
    shiftKey: Boolean(props.value && props.value.includes(ACCELERATORS.SHIFT)),
    character:
      props.value &&
      props.value.replace(
        new RegExp(
          `${ACCELERATORS.COMMAND}|${ACCELERATORS.ALT}|Or|${ACCELERATORS.CONTROL}|${ACCELERATORS.SHIFT}|\\+`,
          'g',
        ),
        '',
      ),
  });

  const [initialPressedKeys] = useState<PressedKeys>(
    getInitialStateFromProps(),
  );
  const [pressedKeys, setPressedKeys] =
    useState<PressedKeys>(initialPressedKeys);
  const [isShortcutValid, setIsShortcutValid] = useState<boolean | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!isShortcutValid) {
      return;
    }

    const {metaKey, altKey, ctrlKey, shiftKey, character} = pressedKeys;

    const accelerator = [
      metaKey && ACCELERATORS.COMMAND,
      altKey && ACCELERATORS.ALT,
      ctrlKey && ACCELERATORS.CONTROL,
      shiftKey && ACCELERATORS.SHIFT,
      character,
    ].filter(Boolean);

    if (typeof props.onChange === 'function') {
      props.onChange(accelerator.join('+'));
    }
  }, [isShortcutValid]);

  const inputRef = useRef<HTMLInputElement>(null);
  let typingTimeout: NodeJS.Timeout;

  const handleFocusInput = () => {
    if (inputRef.current !== null) {
      inputRef.current.focus();
    }
  };

  const isCharacterSpecial = (keycode: number) =>
    Object.values(KEYCODES).includes(keycode);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.which === 9) {
      return;
    }

    event.preventDefault();

    const {metaKey, altKey, ctrlKey, shiftKey} = event;
    const character = isCharacterSpecial(event.which)
      ? ''
      : String.fromCharCode(event.which);

    setPressedKeys({
      metaKey,
      altKey,
      ctrlKey,
      shiftKey,
      character,
    });
    setIsShortcutValid(undefined);
  };

  const handleKeyUp = () => {
    const {metaKey, altKey, ctrlKey, shiftKey, character} = pressedKeys;

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(
      () =>
        setIsShortcutValid(
          ([metaKey, altKey, ctrlKey, shiftKey].includes(true) &&
            character !== '') ||
            [metaKey, altKey, ctrlKey, shiftKey, character].every(
              (value) => !value,
            ),
        ),
      500,
    );
  };

  const handleUpdatePressedKeys = (keys: PressedKeys) => {
    setPressedKeys(keys);
    handleKeyUp();
    handleFocusInput();
    setIsShortcutValid(undefined);
  };

  const renderKeys = () => {
    const keys = [
      pressedKeys.metaKey && '⌘',
      pressedKeys.altKey && '⌥',
      pressedKeys.ctrlKey && '⌃',
      pressedKeys.shiftKey && '⇧',
      pressedKeys.character,
    ].filter(Boolean);

    return keys.map((key, index) => (
      <ShortcutKeyContainer key={index}>
        <ShortcutKey>{key}</ShortcutKey>
      </ShortcutKeyContainer>
    ));
  };

  return (
    <Container>
      <Label>{props.label}</Label>
      <ShortcutKeysContainer
        invalid={isShortcutValid === false}
        onClick={handleFocusInput}>
        {renderKeys()}

        <HiddenInput
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
        />
      </ShortcutKeysContainer>

      <FlexColumn onClick={() => handleUpdatePressedKeys(initialPressedKeys)}>
        <CenteredGlyph name="undo" variant="outline" />
      </FlexColumn>

      <FlexColumn
        onClick={() =>
          handleUpdatePressedKeys({
            metaKey: false,
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
            character: '',
          })
        }>
        <CenteredGlyph name="cross" variant="outline" />
      </FlexColumn>
    </Container>
  );
};

export default KeyboardShortcutInput;
