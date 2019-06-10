import type {Route} from './types.js';

import {
  PureComponent,
  FlexRow,
  FlexColumn,
  Input,
  Text,
  Select,
  styled,
} from 'flipper';

type Props = {
  route: Route
};

type State = {
  requestUrl: string,
  method: string,
  data: string
}

const StyledSelectContainer = styled(FlexRow)({
  paddingLeft: 6,
  paddingTop: 2,
  paddingBottom: 2,
  height: '100%',
  flexGrow: 1
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
  height: 250,
  fontSize: 15,
  color: '#333',
  padding: 10,
  resize: 'none',
  fontFamily: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace',
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
  marginLeft : 8,
  flexGrow: 5
});

const Container = styled(FlexColumn)({
  flexWrap: 'nowrap',
  alignItems: 'flex-start',
  alignContent: 'flex-start',
  flexGrow: 1,
  overflow: 'hidden',
});

export class MockResponseDetails extends PureComponent<Props, State> {

  constructor(props) {
    super(props);

    // Copy the route info from props
    const route = (this.props != null && this.props.route !== null) ? this.props.route : {
      requestUrl: '',
      method: 'GET',
      data: ''
    };

    // Initial state
    this.state = {
      requestUrl: route.requestUrl
    };

    this.handleURLInputChange = this.handleURLInputChange.bind(this);
    this.handleDataTextAreaChange = this.handleDataTextAreaChange.bind(this);
  }


  handleURLInputChange(event) {
    this.setState({
      requestUrl: event.target.value
    });
  }

  handleDataTextAreaChange(event) {
    this.setState({
      data: event.target.value
    });
  }


  render() {

    const methodOptions = ['GET', 'POST'];

    const { requestUrl, method, data } = this.state;

    console.log(this.state);

    return (
      <Container>
        <FlexRow style={{width: '100%'}}>
          <StyledSelectContainer>
            <StyledSelect
              grow={true}
              selected={method !== undefined ? method : 'GET'}
              options={methodOptions}
              onChange={(selectedMethod: string) => {
                this.setState({
                  ...this.state,
                  method: selectedMethod
                })
              }}>

            </StyledSelect>
          </StyledSelectContainer>

          <StyledInput
            type="text"
            placeholder="URL"
            value={requestUrl}
            onChange={this.handleURLInputChange}/>
        </FlexRow>
        <StyledText>Data</StyledText>
        <textarea
          style={textAreaStyle}
          wrap="soft"
          autoComplete="off"
          spellCheck="false"
          value={data}
          onChange={this.handleDataTextAreaChange}/>
      </Container>
    );
  }
}