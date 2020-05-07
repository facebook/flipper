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
  colors,
  styled,
} from 'flipper';
import React, {memo, useState} from 'react';
import {ROW_HEIGHT} from '../../app/src/ui/components/elements-inspector/elements';

const MultipleSelectorSectionContainer = styled(FlexColumn)({
  maxHeight: 3 * ROW_HEIGHT + 24,
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
      <MultipleSelectorSectionContainer>
        <MultipleSelectorSectionTitle>
          Multiple elements found at the target coordinates
        </MultipleSelectorSectionTitle>
        <ElementsInspector
          onElementSelected={(key: string) => {
            setSelectedId(key);
            onElementSelected(key);
          }}
          onElementHovered={onElementHovered}
          onElementExpanded={() => {}}
          onValueChanged={null}
          root={null}
          selected={selectedId}
          elements={elements}
        />
      </MultipleSelectorSectionContainer>
    );
  },
);

export default MultipleSelectorSection;
