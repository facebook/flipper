/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Element} from './ElementsInspector';
import {PluginClient} from '../../../plugin';
import Client from '../../../Client';
import {Logger} from '../../../fb-interfaces/Logger';
import Panel from '../Panel';
import ManagedDataInspector from '../data-inspector/ManagedDataInspector';
import {Component} from 'react';
import {Console} from '../console';
import GK from '../../../fb-stubs/GK';
import React from 'react';

import deepEqual from 'deep-equal';

type OnValueChanged = (path: Array<string>, val: any) => void;

type InspectorSidebarSectionProps = {
  data: any;
  id: string;
  onValueChanged: OnValueChanged | undefined | null;
  tooltips?: Object;
};

class InspectorSidebarSection extends Component<InspectorSidebarSectionProps> {
  setValue = (path: Array<string>, value: any) => {
    if (this.props.onValueChanged) {
      this.props.onValueChanged([this.props.id, ...path], value);
    }
  };

  shouldComponentUpdate(nextProps: InspectorSidebarSectionProps) {
    return (
      !deepEqual(nextProps, this.props) ||
      this.props.id !== nextProps.id ||
      this.props.onValueChanged !== nextProps.onValueChanged
    );
  }

  extractValue = (val: any) => {
    if (val && val.__type__) {
      return {
        mutable: Boolean(val.__mutable__),
        type: val.__type__ === 'auto' ? typeof val.value : val.__type__,
        value: val.value,
      };
    } else {
      return {
        mutable: typeof val === 'object',
        type: typeof val,
        value: val,
      };
    }
  };

  render() {
    const {id} = this.props;
    return (
      <Panel heading={id} floating={false} grow={false}>
        <ManagedDataInspector
          data={this.props.data}
          setValue={this.props.onValueChanged ? this.setValue : undefined}
          extractValue={this.extractValue}
          expandRoot={true}
          collapsed={true}
          tooltips={this.props.tooltips}
        />
      </Panel>
    );
  }
}

type Props = {
  element: Element | undefined | null;
  tooltips?: Object;
  onValueChanged: OnValueChanged | undefined | null;
  client: PluginClient;
  realClient: Client;
  logger: Logger;
  extensions?: Array<Function>;
};

type State = {
  isConsoleEnabled: boolean;
};

export class InspectorSidebar extends Component<Props, State> {
  state = {
    isConsoleEnabled: false,
  };

  constructor(props: Props) {
    super(props);
    this.checkIfConsoleIsEnabled();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.client !== this.props.client) {
      this.checkIfConsoleIsEnabled();
    }
  }

  async checkIfConsoleIsEnabled() {
    if (
      this.props.client.isConnected &&
      (await this.props.client.supportsMethod('isConsoleEnabled'))
    ) {
      this.props.client
        .call('isConsoleEnabled')
        .then((result: {isEnabled: boolean}) => {
          this.setState({isConsoleEnabled: result.isEnabled});
        });
    } else {
      this.setState({isConsoleEnabled: false});
    }
  }

  render() {
    const {element, extensions} = this.props;
    if (!element || !element.data) {
      return null;
    }

    const sections: Array<any> =
      (extensions &&
        extensions.map((ext) =>
          ext(
            this.props.client,
            this.props.realClient,
            element.id,
            this.props.logger,
          ),
        )) ||
      [];

    for (const key in element.data) {
      if (key === 'Extra Sections') {
        for (const extraSection in element.data[key]) {
          let data:
            | string
            | number
            | boolean
            | {__type__: string; value: any}
            | null = element.data[key][extraSection];

          // data might be sent as stringified JSON, we want to parse it for a nicer persentation.
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch (e) {
              // data was not a valid JSON, type is required to be an object
              console.error(
                `ElementsInspector unable to parse extra section: ${extraSection}`,
              );
              data = null;
            }
          }
          sections.push(
            <InspectorSidebarSection
              tooltips={this.props.tooltips}
              key={extraSection}
              id={extraSection}
              data={data}
              onValueChanged={this.props.onValueChanged}
            />,
          );
        }
      } else {
        sections.push(
          <InspectorSidebarSection
            tooltips={this.props.tooltips}
            key={key}
            id={key}
            data={element.data[key]}
            onValueChanged={this.props.onValueChanged}
          />,
        );
      }
    }

    if (GK.get('sonar_show_console_plugin') && this.state.isConsoleEnabled) {
      sections.push(
        <Panel heading="JS Console" floating={false} grow={false}>
          <Console client={this.props.client} getContext={() => element.id} />
        </Panel>,
      );
    }

    return sections;
  }
}
