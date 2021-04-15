/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlexColumn,
  FlexBox,
  Element,
  ElementID,
  ElementsInspector,
  Glyph,
  colors,
  styled,
} from 'flipper';
import React, {memo, useState} from 'react';

const MultipleSelectorSectionContainer = styled(FlexColumn)({
  maxHeight: 100,
});

const MultipleSelectorSectionTitle = styled(FlexBox)({
  cursor: 'pointer',
  backgroundColor: '#f6f7f9',
  padding: '2px',
  paddingLeft: '9px',
  width: '325px',
  height: '20px',
  fontWeight: 500,
  boxShadow: '2px 2px 2px #ccc',
  border: `1px solid ${colors.light20}`,
  borderTopLeftRadius: '4px',
  borderTopRightRadius: '4px',
  textAlign: 'center',
});

const Chevron = styled(Glyph)({
  marginRight: 4,
  marginLeft: -2,
  marginBottom: 1,
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
    const [collapsed, setCollapsed] = useState(false);
    return (
      <MultipleSelectorSectionContainer>
        <MultipleSelectorSectionTitle
          onClick={() => {
            setCollapsed(!collapsed);
          }}>
          <Chevron name={collapsed ? 'chevron-up' : 'chevron-down'} size={12} />
          Multiple elements found at the target coordinates
        </MultipleSelectorSectionTitle>
        {!collapsed && (
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
          />
        )}
      </MultipleSelectorSectionContainer>
    );
  },
);

export default MultipleSelectorSection;
