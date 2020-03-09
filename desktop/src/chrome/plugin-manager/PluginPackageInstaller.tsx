/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  Toolbar,
  Button,
  FlexRow,
  Tooltip,
  Glyph,
  colors,
  LoadingIndicator,
} from 'flipper';
import styled from '@emotion/styled';
import {default as FileSelector} from '../../ui/components/FileSelector';
import React, {useState} from 'react';
import {installPluginFromFile} from '../../utils/pluginManager';

const CenteredGlyph = styled(Glyph)({
  margin: 'auto',
  marginLeft: 2,
});

const Spinner = styled(LoadingIndicator)({
  margin: 'auto',
  marginLeft: 16,
});

const ButtonContainer = styled(FlexRow)({
  width: 76,
});

const ErrorGlyphContainer = styled(FlexRow)({
  width: 20,
});

export default function PluginPackageInstaller({
  onInstall,
}: {
  onInstall: () => Promise<void>;
}) {
  const [path, setPath] = useState('');
  const [isPathValid, setIsPathValid] = useState(false);
  const [error, setError] = useState<Error>();
  const [inProgress, setInProgress] = useState(false);
  const onClick = async () => {
    setError(undefined);
    setInProgress(true);
    try {
      await installPluginFromFile(path);
      await onInstall();
    } catch (e) {
      setError(e);
      console.error(e);
    } finally {
      setInProgress(false);
    }
  };
  const button = inProgress ? (
    <Spinner size={16} />
  ) : (
    <Button
      compact
      type="primary"
      disabled={!isPathValid}
      title={
        isPathValid
          ? 'Click to install the specified plugin package'
          : 'Cannot install plugin package by the specified path'
      }
      onClick={onClick}>
      Install
    </Button>
  );
  return (
    <Toolbar>
      <FileSelector
        placeholderText="Specify path to a Flipper package or just drag and drop it here..."
        onPathChanged={e => {
          setPath(e.path);
          setIsPathValid(e.isValid);
          setError(undefined);
        }}
      />
      <ButtonContainer>
        <FlexRow>
          {button}
          <ErrorGlyphContainer>
            {error && (
              <Tooltip
                options={{position: 'toRight'}}
                title={`Something went wrong: ${error}`}>
                <CenteredGlyph
                  color={colors.orange}
                  size={16}
                  name="caution-triangle"
                />
              </Tooltip>
            )}
          </ErrorGlyphContainer>
        </FlexRow>
      </ButtonContainer>
    </Toolbar>
  );
}
