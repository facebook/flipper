/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Typography} from 'antd';
import {Element, ElementID, ElementsInspector, styled} from 'flipper';
import {Layout, theme} from 'flipper-plugin';
import React, {memo, useState} from 'react';

const MultipleSelectorSectionContainer = styled(Layout.Container)({
  padding: theme.space.medium,
  background: theme.backgroundWash,
  borderTop: `${theme.space.tiny}px solid ${theme.warningColor}`,
  borderBottom: `${theme.space.tiny}px solid ${theme.warningColor}`,
});

type MultipleSelectorSectionProps = {
  initialSelectedElement: ElementID | null | undefined;
  elements: {[id: string]: Element};
  onElementSelected: (key: string) => void;
  onElementHovered:
    | ((key: string | null | undefined) => any)
    | null
    | undefined;
};

const MultipleSelectorSection: React.FC<MultipleSelectorSectionProps> = memo(
  (props: MultipleSelectorSectionProps) => {
    const {
      initialSelectedElement,
      elements,
      onElementSelected,
      onElementHovered,
    } = props;
    const [selectedId, setSelectedId] = useState<ElementID | null | undefined>(
      initialSelectedElement,
    );
    return (
      <MultipleSelectorSectionContainer gap>
        <Typography.Text>
          Multiple elements were found at the target coordinates. Please select
          one:
        </Typography.Text>
        <ElementsInspector
          onElementSelected={(key: string) => {
            setSelectedId(key);
            onElementSelected(key);
          }}
          onElementHovered={onElementHovered}
          onElementExpanded={() => {}}
          root={null}
          selected={selectedId}
          elements={elements}
          scrollable={false}
        />
      </MultipleSelectorSectionContainer>
    );
  },
);

export default MultipleSelectorSection;
