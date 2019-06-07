import type {Route} from './types.js';

import {
  PureComponent,
  FlexRow,
  FlexColumn,
  Input,
  Text,
  Option,
  Select,
  styled,
  colors
} from 'flipper';

type Props = {
  route: Route
};


const StyledSelectContainer = styled(FlexRow)({
  paddingLeft: 8,
  paddingTop: 2,
  paddingBottom: 2,
  height: '100%',
  flexGrow: 1
});

const StyledSelect = styled(Select)({
  height: '100%',
  maxWidth: 200,
});

const StyledInput = styled(Input)({
  width: '100%',
  height: 20,
});

export class MockResponseDetails extends PureComponent<Props> {

  static Container = styled(FlexColumn)({
    flexWrap: 'nowrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    flexGrow: 1,
    overflow: 'hidden',
  });

  render() {

    const methodOptions = ['GET', 'POST'];

    return (
      <MockResponseDetails.Container>
        <FlexRow style={{width: '100%'}}>
          <StyledSelectContainer>
            <StyledSelect
              grow={true}
              selected={'GET'}
              options={methodOptions}
              onChange={(title: string) => {

              }}>

            </StyledSelect>
          </StyledSelectContainer>

          <StyledInput type="text" placeholder="URL" style={{marginLeft : 8, flexGrow: 5}} />
        </FlexRow>
      </MockResponseDetails.Container>
    );
  }
}