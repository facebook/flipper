/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  Text,
  FlexColumn,
  styled,
  FlexRow,
  Button,
  Spacer,
  Checkbox,
  colors,
  View,
} from 'flipper';
import React, {Component} from 'react';

export type PluginSelection = Map<string, boolean>;

type Props = {
  onSelect: (plugins: Array<string>) => void;
  onHide: () => any;
  plugins: PluginSelection;
};

const Title = styled(Text)({
  margin: 6,
});

type State = {
  plugins: PluginSelection;
};

const Container = styled(FlexColumn)({
  padding: 8,
  width: 700,
  maxHeight: 700,
});

const Line = styled(View)({
  backgroundColor: colors.greyTint2,
  height: 1,
  width: 'auto',
  flexShrink: 0,
});

const PluginRowComponentContainer = styled(FlexColumn)({
  overflow: 'scroll',
  height: 'auto',
  backgroundColor: colors.white,
  maxHeight: 500,
});

const Padder = styled('div')(
  ({paddingLeft, paddingRight, paddingBottom, paddingTop}) => ({
    paddingLeft: paddingLeft || 0,
    paddingRight: paddingRight || 0,
    paddingBottom: paddingBottom || 0,
    paddingTop: paddingTop || 0,
  }),
);

type PluginRowComponentProps = {
  name: string;
  selected: boolean;
  onChange: (name: string, selected: boolean) => void;
};

class PluginRowComponent extends Component<PluginRowComponentProps> {
  render() {
    const {name, selected, onChange} = this.props;
    return (
      <FlexColumn>
        <Padder
          paddingRight={8}
          paddingTop={8}
          paddingBottom={8}
          paddingLeft={8}>
          <FlexRow>
            <Text> {name} </Text>
            <Spacer />
            <Checkbox
              checked={selected}
              onChange={selected => {
                onChange(name, selected);
              }}
            />
          </FlexRow>
        </Padder>
        <Line />
      </FlexColumn>
    );
  }
}

export default class SelectPluginSheet extends Component<Props, State> {
  state = {plugins: new Map<string, boolean>()};
  static getDerivedStateFromProps(props: Props, state: State) {
    if (state.plugins.size > 0) {
      return null;
    }
    return {plugins: props.plugins};
  }

  onSubmit(plugins: PluginSelection) {
    const selectedArray = Array.from(plugins.entries()).reduce(
      (acc, [plugin, selected]) => {
        if (selected) {
          acc.push(plugin);
        }
        return acc;
      },
      [],
    );
    this.props.onSelect(selectedArray);
  }
  render() {
    const {onHide} = this.props;
    const {plugins} = this.state;

    return (
      <Container>
        <FlexColumn>
          <Title>
            Select the plugins for which you want to export the data
          </Title>
          <PluginRowComponentContainer>
            {Array.from(plugins.entries()).map(([pluginID, selected]) => {
              return (
                <PluginRowComponent
                  name={pluginID}
                  selected={selected}
                  onChange={(id: string, selected: boolean) => {
                    plugins.set(id, selected);
                    this.setState({plugins});
                  }}
                />
              );
            })}
          </PluginRowComponentContainer>
        </FlexColumn>
        <Padder paddingTop={8} paddingBottom={2}>
          <FlexRow>
            <Spacer />
            <Button
              compact
              padded
              type={'success'}
              onClick={() => {
                this.onSubmit(this.state.plugins);
              }}>
              Submit
            </Button>
            <Button compact padded onClick={onHide}>
              Close
            </Button>
          </FlexRow>
        </Padder>
      </Container>
    );
  }
}
