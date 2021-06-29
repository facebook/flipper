/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  styled,
  colors,
  ManagedTable,
  TableBodyRow,
  FlexCenter,
  LoadingIndicator,
  Button,
  Glyph,
} from 'flipper';
import {parseURIParameters, stripQueryParameters} from '../util/uri';
import React from 'react';
import {theme} from 'flipper-plugin';

const BOX_HEIGHT = 240;

type Props = {
  isBookmarked: boolean;
  uri: string | null;
  className: string | null;
  onNavigate: (query: string) => void;
  onFavorite: (query: string) => void;
  screenshot: string | null;
  date: Date | null;
};

const ScreenshotContainer = styled.div({
  width: 200,
  minWidth: 200,
  overflow: 'hidden',
  borderLeft: `1px ${colors.blueGreyTint90} solid`,
  position: 'relative',
  height: '100%',
  borderRadius: 10,
  img: {
    width: '100%',
  },
});

const NoData = styled.div({
  color: colors.light30,
  fontSize: 14,
  position: 'relative',
});

const NavigationDataContainer = styled.div({
  alignItems: 'flex-start',
  flexGrow: 1,
  position: 'relative',
});

const Footer = styled.div({
  width: '100%',
  padding: '10px',
  borderTop: `1px ${colors.blueGreyTint90} solid`,
  display: 'flex',
  alignItems: 'center',
});

const Seperator = styled.div({
  flexGrow: 1,
});

const TimeContainer = styled.div({
  color: colors.light30,
  fontSize: 14,
});

const NavigationInfoBoxContainer = styled.div({
  display: 'flex',
  height: BOX_HEIGHT,
  borderRadius: 10,
  flexGrow: 1,
  position: 'relative',
  marginBottom: 10,
  backgroundColor: theme.backgroundDefault,
  boxShadow: '1px 1px 5px rgba(0,0,0,0.1)',
});

const Header = styled.div({
  fontSize: 18,
  fontWeight: 500,
  userSelect: 'text',
  cursor: 'text',
  padding: 10,
  borderBottom: `1px ${colors.blueGreyTint90} solid`,
  display: 'flex',
});

const ClassNameContainer = styled.div({
  color: colors.light30,
});

const ParametersContainer = styled.div({
  height: 150,
  '&>*': {
    height: 150,
    marginBottom: 20,
  },
});

const NoParamters = styled(FlexCenter)({
  fontSize: 18,
  color: colors.light10,
});

const TimelineCircle = styled.div({
  width: 18,
  height: 18,
  top: 11,
  left: -33,
  backgroundColor: theme.backgroundWash,
  border: `4px solid ${colors.highlight}`,
  borderRadius: '50%',
  position: 'absolute',
});

const TimelineMiniCircle = styled.div({
  width: 12,
  height: 12,
  top: 1,
  left: -30,
  borderRadius: '50%',
  backgroundColor: theme.textColorActive,
  position: 'absolute',
});

const buildParameterTable = (parameters: Map<string, string>) => {
  const tableRows: Array<TableBodyRow> = [];
  let idx = 0;
  parameters.forEach((parameter_value, parameter) => {
    tableRows.push({
      key: idx.toString(),
      columns: {
        parameter: {
          value: parameter,
        },
        value: {
          value: parameter_value,
        },
      },
    });
    idx++;
  });
  return (
    <ManagedTable
      columns={{parameter: {value: 'Parameter'}, value: {value: 'Value'}}}
      rows={tableRows}
      zebra={false}
    />
  );
};

export default (props: Props) => {
  const {
    uri,
    isBookmarked,
    className,
    screenshot,
    onNavigate,
    onFavorite,
    date,
  } = props;
  if (uri == null && className == null) {
    return (
      <>
        <NoData>
          <TimelineMiniCircle />
          Unknown Navigation Event
        </NoData>
      </>
    );
  } else {
    const parameters = uri != null ? parseURIParameters(uri) : null;
    return (
      <NavigationInfoBoxContainer>
        <TimelineCircle />
        <NavigationDataContainer>
          <Header>
            {uri != null ? stripQueryParameters(uri) : ''}
            <Seperator />
            {className != null ? (
              <>
                <Glyph
                  color={colors.light30}
                  size={16}
                  name="paper-fold-text"
                />
                &nbsp;
                <ClassNameContainer>
                  {className != null ? className : ''}
                </ClassNameContainer>
              </>
            ) : null}
          </Header>
          <ParametersContainer>
            {parameters != null && parameters.size > 0 ? (
              buildParameterTable(parameters)
            ) : (
              <NoParamters grow>No Parameters for this Event</NoParamters>
            )}
          </ParametersContainer>
          <Footer>
            {uri != null ? (
              <>
                <Button onClick={() => onNavigate(uri)}>Open</Button>
                <Button onClick={() => onFavorite(uri)}>
                  {isBookmarked ? 'Edit Bookmark' : 'Bookmark'}
                </Button>
              </>
            ) : null}
            <Seperator />
            <TimeContainer>
              {date != null ? date.toTimeString() : ''}
            </TimeContainer>
          </Footer>
        </NavigationDataContainer>
        {uri != null || className != null ? (
          <ScreenshotContainer>
            {screenshot != null ? (
              <img src={screenshot} />
            ) : (
              <FlexCenter grow>
                <LoadingIndicator size={32} />
              </FlexCenter>
            )}
          </ScreenshotContainer>
        ) : null}
      </NavigationInfoBoxContainer>
    );
  }
};
