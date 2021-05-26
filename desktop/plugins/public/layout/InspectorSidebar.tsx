/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ManagedDataInspector,
  Panel,
  FlexCenter,
  styled,
  colors,
  PluginClient,
  Element,
  Client,
  Logger,
} from 'flipper';
import {PureComponent} from 'react';
import React from 'react';
import {useMemo, useEffect} from 'react';
import {kebabCase} from 'lodash';
import {SidebarExtensions} from './extensions/fb-stubs/SidebarExtensions';

const NoData = styled(FlexCenter)({
  fontSize: 18,
  color: colors.macOSTitleBarIcon,
});

type OnValueChanged = (path: Array<string>, val: any) => void;

type InspectorSidebarSectionProps = {
  data: any;
  id: string;
  onValueChanged: OnValueChanged | null;
  tooltips?: Object;
};

class InspectorSidebarSection extends PureComponent<InspectorSidebarSectionProps> {
  setValue = (path: Array<string>, value: any) => {
    if (this.props.onValueChanged) {
      this.props.onValueChanged([this.props.id, ...path], value);
    }
  };

  extractValue = (val: any, _depth: number) => {
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
          expandRoot
          collapsed
          tooltips={this.props.tooltips}
        />
      </Panel>
    );
  }
}

type Props = {
  element: Element | null;
  tooltips?: Object;
  onValueChanged: OnValueChanged | null;
  client: PluginClient;
  realClient: Client;
  logger: Logger;
};

const Sidebar: React.FC<Props> = (props: Props) => {
  const {element} = props;

  const [sectionDefs, sectionKeys] = useMemo(() => {
    const sectionKeys = [];
    const sectionDefs = [];

    if (element && element.data)
      for (const key in element.data) {
        if (key === 'Extra Sections') {
          for (const extraSection in element.data[key]) {
            const section = element.data[key][extraSection];
            let data = {};

            // data might be sent as stringified JSON, we want to parse it for a nicer persentation.
            if (typeof section === 'string') {
              try {
                data = JSON.parse(section);
              } catch (e) {
                // data was not a valid JSON, type is required to be an object
                console.error(
                  `ElementsInspector unable to parse extra section: ${extraSection}`,
                );
                data = {};
              }
            } else {
              data = section;
            }
            sectionKeys.push(kebabCase(extraSection));
            sectionDefs.push({
              key: extraSection,
              id: extraSection,
              data: data,
            });
          }
        } else {
          sectionKeys.push(kebabCase(key));
          sectionDefs.push({
            key,
            id: key,
            data: element.data[key],
          });
        }
      }

    return [sectionDefs, sectionKeys];
  }, [element]);

  const sections: Array<React.ReactNode> = (
    (SidebarExtensions &&
      element?.data &&
      Object.entries(SidebarExtensions).map(([ext, Comp]) => (
        <Comp
          key={ext}
          client={props.client}
          realClient={props.realClient}
          logger={props.logger}
          selectedNode={element}
        />
      ))) ||
    []
  ).concat(
    sectionDefs.map((def) => (
      <InspectorSidebarSection
        tooltips={props.tooltips}
        key={def.key}
        id={def.id}
        data={def.data}
        onValueChanged={props.onValueChanged}
      />
    )),
  );

  useEffect(() => {
    sectionKeys.map((key) =>
      props.logger.track('usage', `layout-sidebar-extension:${key}:loaded`),
    );
  }, [sectionKeys.join(',')]);

  if (!element || !element.data) {
    return <NoData grow>No data</NoData>;
  }
  return <>{sections}</>;
};

export default Sidebar;
