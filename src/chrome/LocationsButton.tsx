/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Button, styled} from 'flipper';
import {connect} from 'react-redux';
import React, {Component} from 'react';
import {State} from '../reducers';

import BaseDevice from '../devices/BaseDevice';

type OwnProps = {
  locations: Array<string>;
  selectedLocation?: string;
};

type StateFromProps = {
  selectedDevice: BaseDevice | null | undefined;
};

type DispatchFromProps = {};

const DropdownButton = styled(Button)({
  fontSize: 11,
});

type Props = OwnProps & StateFromProps & DispatchFromProps;
class LocationsButton extends Component<Props> {
  goToLocation = (location: string) => {
    const {selectedDevice} = this.props;
    if (selectedDevice != null) {
      selectedDevice.navigateToLocation(location);
    }
  };

  render() {
    const {locations, selectedLocation} = this.props;
    return (
      <DropdownButton
        compact={true}
        dropdown={locations.map(location => {
          return {
            click: () => {
              this.goToLocation(location);
            },
            label: location,
          };
        })}>
        {selectedLocation || '(none)'}
      </DropdownButton>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, State>(
  ({connections: {selectedDevice}}) => ({
    selectedDevice,
  }),
)(LocationsButton);
