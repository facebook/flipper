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
  FlexBox,
  Input,
  Text,
  Tabs,
  Tab,
  Glyph,
  ManagedTable,
  ContextMenu,
  Select,
  styled,
  colors,
} from 'flipper';
import type {RequestId, Header} from './types';

type Props = {
  id: RequestId,
  route: Route,
  handleRouteChange: (selectedId: RequestId, route: Route) => {},
};

type State = {
  activeTab: string,
  selectedHeaderIds: [],
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
  flexGrow: 5
});

const HeaderInput = styled(Input)({
  width: '100%',
  height: 20,
  marginTop: 6,
  marginBottom: 6,
});

const HeaderGlyph = styled(Glyph)({
  marginTop: 6,
  marginBottom: 6,
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

const AddHeaderButton = styled(FlexBox)({
  color: colors.blackAlpha50,
  marginTop: 8,
  alignItems: 'center',
  padding: 10,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const HeadersColumnSizes = {
  name: '40%',
  value: '40%',
  close: '10%',
  warning: 'flex',
};

const HeadersColumns = {
  name: {
    value: 'Name',
    resizable: false,
  },
  value: {
    value: 'Value',
    resizable: false,
  },
  close: {
    value: '',
    resizable: false,
  },
  warning: {
    value: '',
    resizable: false,
  },
};

const StyledContextMenu = styled(ContextMenu)({
  flex: 1,
});

export class MockResponseDetails extends Component<Props, State> {

  state = {
    activeTab: 'data'
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

  handleHeaderNameChange = (event) => {
    const route = this.props.route;
    const {selectedHeaderIds} = this.state;
    const selectedId = selectedHeaderIds.length === 1 ? selectedHeaderIds[0] : null;
    route.headers[selectedId].key = event.target.value;
    this.updateRouteChange(route);
  };

  handleHeaderValueChange = (event) => {
    const route = this.props.route;
    const {selectedHeaderIds} = this.state;
    const selectedId = selectedHeaderIds.length === 1 ? selectedHeaderIds[0] : null;
    route.headers[selectedId].value = event.target.value;
    this.updateRouteChange(route);
  };

  onRowHighlighted = (selectedIds: Array<RequestId>) =>
    this.setState({selectedHeaderIds: selectedIds});

  onActive = (key: ?string) => {
    this.setState({
      activeTab: key
    })
  };

  buildRows = () => {
    const {route} = this.props;
    if (route && route.headers) {
      let rows = [];
      route.headers.forEach((header: Header, index: number) => {
        rows.push(this.buildRow(header, index));
      });
      return rows;
    }
    return [];
  };

  buildRow = (header: Header, index: number) => {
    const {selectedHeaderIds} = this.state;
    const selectedId = selectedHeaderIds? selectedHeaderIds.length === 1 ? selectedHeaderIds[0] : null : 0;
    return {
      columns: {
        name: {
          value:
            <HeaderInput type="text"
                         placeholder="Name"
                         value={header.key}
                         style={selectedId === index? {backgroundColor: colors.highlight}:{}}
                         onChange={this.handleHeaderNameChange} />
        },
        value: {
          value:
            <HeaderInput type="text"
                         placeholder="Value"
                         value={header.value}
                         style={selectedId === index? {backgroundColor: colors.highlight}:{}}
                         onChange={this.handleHeaderValueChange}/>
        },
        close: {
          value:
            <FlexBox onClick={this.deleteRow}>
              <HeaderGlyph name="cross-circle" color={colors.red}  />
            </FlexBox>
        },
        warning: {
          value:
            <HeaderGlyph name="caution-triangle" color={colors.yellow} />
        },
      },
      key: index,
    };
  };

  addRow = () => {
    const header = {
      key: '',
      value: '',
    };
    const route = this.props.route;
    const headers = route.headers ? route.headers : [];
    headers.push(header);
    route.headers = headers;
    this.updateRouteChange(route);
  };

  deleteRow = () => {
    console.log();
    const route = this.props.route;
    const headers = route.headers;
    // TODO Try to find a way to get the index
    headers.splice(index,1);
    route.headers = headers;
    this.updateRouteChange(route)
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
        {isDuplicate ? (
          <Warning>
            <Glyph name="caution-triangle" color={colors.yellow}/>
            <Text style={{marginLeft: 5}}>
              Route is duplicated (Same URL and Method)
            </Text>
          </Warning>
        ) : null}
        <StyledText />
        <Tabs active={this.state.activeTab}
              onActive={this.onActive}>
          <Tab
            key={'data'}
            label={'Data'}>
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
            <StyledContextMenu>
              <ManagedTable
                hideHeader={true}
                multiline={true}
                columnSizes={HeadersColumnSizes}
                columns={HeadersColumns}
                rows={this.buildRows()}
                stickyBottom={true}
                autoHeight={true}
                floating={false}
                height={300}
                zebra={false}
                onRowHighlighted={this.onRowHighlighted}
                highlightedRows={
                  this.state.selectedHeaderIds ? new Set(this.state.selectedHeaderIds) : null
                }/>
            </StyledContextMenu>
            <AddHeaderButton onClick={this.addRow}>
              <Glyph
                name="plus-circle"
                size={16}
                variant="outline"
                color={colors.blackAlpha30}
              />
              &nbsp;Add Header
            </AddHeaderButton>
          </Tab>
        </Tabs>
      </Container>
    );
  }
}
