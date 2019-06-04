import {
  PureComponent,
  Text
} from 'flipper';

type Props = {
  a: boolean
};

type State = {};


export class ManageMockResponsePanel extends PureComponent<Props, State> {
  render() {
    return (<Text>Hello world</Text>);
  }
}