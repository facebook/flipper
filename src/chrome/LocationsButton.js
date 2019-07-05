/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Button, Component, styled} from 'flipper';
import {connect} from 'react-redux';

import type BaseDevice from '../devices/BaseDevice';
import AndroidDevice from '../devices/AndroidDevice';

type OwnProps = {|
  locations: Array<string>,
  selectedLocation?: string,
|};

type Props = {|
  ...OwnProps,
  selectedDevice?: BaseDevice,
|};

const DropdownButton = styled(Button)({
  fontSize: 11,
});

class LocationsButton extends Component<Props> {
  goToLocation = (location: string) => {
    const {selectedDevice} = this.props;
    if (selectedDevice instanceof AndroidDevice) {
      let shellCommand = `am start ${location}`;
      selectedDevice.adb.shell(selectedDevice.serial, shellCommand);
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

export default connect<Props, OwnProps, _, _, _, _>(
  ({connections: {selectedDevice}}) => ({
    selectedDevice,
  }),
)(LocationsButton);
