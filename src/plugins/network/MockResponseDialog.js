import {
  Component,
  FlexColumn,
  FlexRow,
  Button,
  styled
} from 'flipper';

import {
  ManageMockResponsePanel
} from './ManageMockResponsePanel'
import type {Route} from "./types";

type Props = {
  onHide: () => void,
  onDismiss:() => void,
  handleRoutesChange : (routes: Route[]) => void
};

const Title = styled('div')({
  fontWeight: '500',
  marginBottom: 10,
  marginTop: 8,
});

const Container = styled(FlexColumn)({
  padding: 10,
  width: 800,
  height: 550,
});

const Row = styled(FlexColumn)({
  alignItems: 'flex-end',
  marginTop: 16
});

export class MockResponseDialog extends Component<Props> {

  onCloseButtonClicked = () => {
    this.props.onHide();
    this.props.onDismiss();
  };

  render() {
    return (
      <Container>
        <Title>Mock Network Responses</Title>
        <ManageMockResponsePanel
          handleRoutesChange={this.props.handleRoutesChange}
        />
        <Row>
          <Button compact padded onClick={this.onCloseButtonClicked}>
            Close
          </Button>
        </Row>
      </Container>
    );
  }
}