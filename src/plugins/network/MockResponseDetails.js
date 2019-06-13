/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Route} from './types.js';

import {
  Component,
  FlexRow,
  FlexColumn,
  Input,
  Text,
  Tabs,
  Tab,
  Glyph,
  Select,
  styled,
  colors,
} from 'flipper';
import type {RequestId} from './types';

type Props = {
  id: RequestId,
  route: Route,
  handleRouteChange: (selectedId: RequestId, route: Route) => {},
};

type State = {
  activeTab: string,
}

const StyledSelectContainer = styled(FlexRow)({
  paddingLeft: 6,
  paddingTop: 2,
  paddingBottom: 2,
  height: '100%',
  flexGrow: 1,
});

const StyledSelect = styled(Select)({
  height: '100%',
  maxWidth: 200,
});

const StyledText = styled(Text)({
  marginLeft: 6,
  marginTop: 8,
});

const textAreaStyle = {
  width: '100%',
  marginTop: 8,
  height: 300,
  fontSize: 15,
  color: '#333',
  padding: 10,
  resize: 'none',
  fontFamily:
    'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace',
  display: 'inline-block',
  lineHeight: 1.5,
  border: '1px solid #dcdee2',
  borderRadius: 4,
  backgroundColor: '#fff',
  cursor: 'text',
  WebkitTapHighlightColor: 'transparent',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
};

const StyledInput = styled(Input)({
  width: '100%',
  height: 20,
  marginLeft: 8,
  flexGrow: 5,
});

const Container = styled(FlexColumn)({
  flexWrap: 'nowrap',
  alignItems: 'flex-start',
  alignContent: 'flex-start',
  flexGrow: 1,
  overflow: 'hidden',
});

const Warning = styled(FlexRow)({
  marginTop: 8,
});

export class MockResponseDetails extends Component<Props, State> {

  state = {
    activeTab: 'response'
  };

  updateRouteChange = (route: Route) => {
    this.props.handleRouteChange(this.props.id, route);
  };

  handleMethodSelectChange = (text: string) => {
    const route = this.props.route;
    route.method = text;
    this.updateRouteChange(route);
  };

  handleURLInputChange = event => {
    const route = this.props.route;
    route.requestUrl = event.target.value;
    this.updateRouteChange(route);
  };

  handleDataTextAreaChange = event => {
    const route = this.props.route;
    route.data = event.target.value;
    this.updateRouteChange(route);
  };

  onActive = (key: ?string) => {
    this.setState({
      activeTab: key
    })
  };

  render() {
    const methodOptions = ['GET', 'POST'];
    const {requestUrl, method, data, isDuplicate} = this.props.route;

    return (
      <Container>
        <FlexRow style={{width: '100%'}}>
          <StyledSelectContainer>
            <StyledSelect
              grow={true}
              selected={method !== undefined ? method : 'GET'}
              options={methodOptions}
              onChange={this.handleMethodSelectChange}
            />
          </StyledSelectContainer>

          <StyledInput
            type="text"
            placeholder="URL"
            value={requestUrl}
            onChange={this.handleURLInputChange}
          />
        </FlexRow>
        <StyledText />
        <Tabs active={this.state.activeTab}
              onActive={this.onActive}>
          <Tab
            key={'response'}
            label={'Response'}>
            <textarea
              style={textAreaStyle}
              wrap="soft"
              autoComplete="off"
              spellCheck="false"
              value={data}
              onChange={this.handleDataTextAreaChange}
            />
          </Tab>
          <Tab
            key={'headers'}
            label={'Headers'}>
            <StyledText>Hello</StyledText>
          </Tab>
        </Tabs>
        {isDuplicate ? (
          <Warning>
            <Glyph name="caution-triangle" color={colors.yellow}/>
            <Text style={{marginLeft: 5}}>
              Route is duplicated (Same URL and Method)
            </Text>
          </Warning>
        ) : null}
      </Container>
    );
  }
}
