/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {UpdateTreeGenerationChangesetApplicationPayload} from './Models.js';

import React from 'react';
import {
  MarkerTimeline,
  Component,
  styled,
  FlexBox,
  ManagedDataInspector,
  Panel,
  colors,
} from 'flipper';

const NoContent = styled(FlexBox)({
  alignItems: 'center',
  justifyContent: 'center',
  flexGrow: 1,
  fontWeight: '500',
  color: colors.light30,
});

type Props = {|
  changeSets: ?Array<UpdateTreeGenerationChangesetApplicationPayload>,
  eventUserInfo: ?Object,
  focusedChangeSet: ?UpdateTreeGenerationChangesetApplicationPayload,
  onFocusChangeSet: (
    focusedChangeSet: ?UpdateTreeGenerationChangesetApplicationPayload,
  ) => void,
  selectedNodeInfo: ?Object,
|};

export default class DetailsPanel extends Component<Props> {
  render() {
    const {changeSets, eventUserInfo} = this.props;
    const firstChangeSet =
      (changeSets || []).reduce(
        (min, cs) => Math.min(min, cs.timestamp),
        Infinity,
      ) || 0;
    return (
      <React.Fragment>
        {eventUserInfo && (
          <Panel
            key="eventUserInfo"
            collapsable={false}
            floating={false}
            heading={'Event User Info'}>
            <ManagedDataInspector data={eventUserInfo} expandRoot={true} />
          </Panel>
        )}
        {changeSets && changeSets.length > 0 ? (
          <Panel
            key="Changesets"
            collapsable={false}
            floating={false}
            heading={'Changesets'}>
            <MarkerTimeline
              points={changeSets.map((p) => ({
                label:
                  p.type === 'CHANGESET_GENERATED' ? 'Generated' : 'Rendered',
                time: Math.round((p.timestamp || 0) - firstChangeSet),
                color:
                  p.type === 'CHANGESET_GENERATED' ? colors.lemon : colors.teal,
                key: p.identifier,
              }))}
              onClick={(ids) =>
                this.props.onFocusChangeSet(
                  changeSets.find((c) => c.identifier === ids[0]),
                )
              }
              selected={this.props.focusedChangeSet?.identifier}
            />
          </Panel>
        ) : (
          <NoContent>No changes sets available</NoContent>
        )}
        {this.props.focusedChangeSet && (
          <Panel
            key="Changeset Details"
            floating={false}
            heading="Changeset Details">
            <ManagedDataInspector
              data={this.props.focusedChangeSet.changeset}
              expandRoot={true}
            />
          </Panel>
        )}
        {this.props.selectedNodeInfo && (
          <Panel
            key="Selected Node Info"
            floating={false}
            heading="Selected Node Info">
            <ManagedDataInspector
              data={this.props.selectedNodeInfo}
              expandRoot={true}
            />
          </Panel>
        )}
      </React.Fragment>
    );
  }
}
