/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  SearchInput,
  styled,
  colors,
  SearchIcon,
  SearchBox,
  FlexColumn,
  FlexRow,
  Text,
  Tooltip,
  Line,
  Spacer,
  Glyph,
} from '../ui';
import React, {useState, useCallback, useEffect, useRef} from 'react';

const RowComponentContainer = styled(FlexRow)({
  height: '24px',
  margin: '4px',
  alignItems: 'center',
  flexShrink: 0,
});

const Separator = styled(Line)({margin: '2px 0px'});

const OverlayContainer = styled.div({
  height: '100%',
  overflow: 'visible',
  position: 'absolute',
  top: '30px',
  left: '0px',
  width: '100%',
  zIndex: 100,
});

const ListViewContainer = styled(FlexColumn)({
  borderWidth: '0px 1px 1px',
  borderStyle: 'solid',
  borderColor: colors.greyTint2,
  margin: '0px 10px',
  maxHeight: '300px',
  backgroundColor: colors.white,
});

const StyledSearchInput = styled(SearchInput)({
  height: '20px',
  margin: '4px',
});

type Element = {id: string; label: string};
type Props = {
  list: Array<Element>;
  onSelect?: (id: string, label: string) => void;
  handleNoResults?: (value: string) => void;
  selectedElementID?: string;
};

function RowComponent(props: {
  elem: Element;
  onClick: (id: string) => void;
  selected?: boolean;
}) {
  return (
    <RowComponentContainer
      data-testid={'row-component'}
      onClick={() => {
        props.onClick(props.elem.id);
      }}>
      <Text>{props.elem.label}</Text>
      <Spacer />
      {props.selected && (
        <Glyph color={colors.highlightTint15} name="checkmark" />
      )}
    </RowComponentContainer>
  );
}

export default function (props: Props) {
  const {list, handleNoResults, onSelect, selectedElementID} = props;

  const [filteredElements, setFilteredElements] = useState<Array<Element>>([]);
  const [searchedValue, setSearchedValue] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<Element | undefined>(
    undefined,
  );
  const [focussed, setFocus] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const onChangeCallBack = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchedValue(e.target.value.trim());
    },
    [setSearchedValue],
  );

  const onSelectCallBack = useCallback(
    (id: string) => {
      const elem = list.find((e) => {
        return e.id === id;
      });
      if (elem) {
        setSearchedValue(elem.label);
        setSelectedElement(elem);
      }
      setFocus(false);
      if (elem && onSelect) {
        onSelect(elem.id, elem.label);
      }
    },
    [list, onSelect, setSearchedValue],
  );

  const onFocusCallBack = useCallback(
    (_e: React.FocusEvent<HTMLInputElement>) => {
      setFocus(true);
    },
    [setFocus],
  );

  // Set the searched value and selectedElement when the selectedElementID changes.
  useEffect(() => {
    const initialElement = list.find((e) => e.id === selectedElementID);
    if (initialElement) {
      setSearchedValue(initialElement.label);
    }
    setSelectedElement(initialElement);
    setFocus(false);
  }, [selectedElementID, list]);

  // Effect to filter items
  useEffect(() => {
    if (searchedValue.length > 0) {
      const filteredValues = list.filter((s) => {
        return s.label.toLowerCase().includes(searchedValue.toLowerCase());
      });
      if (filteredValues.length === 0 && handleNoResults) {
        handleNoResults(searchedValue);
      }
      setFilteredElements(filteredValues);
    } else if (focussed) {
      setFilteredElements(list);
    }
  }, [searchedValue, handleNoResults, list, setFilteredElements, focussed]);

  // Effect to detect outside click
  useEffect(() => {
    //TODO: Generalise this effect so that other components can use it.
    function handleClickOutside(event: MouseEvent) {
      const current = wrapperRef.current;
      const target = event.target;
      if (
        wrapperRef &&
        current &&
        target &&
        !current.contains(target as Node) &&
        focussed
      ) {
        if (selectedElement && onSelect) {
          setSearchedValue(selectedElement.label);
          onSelect(selectedElement.id, selectedElement.label);
        }
        setFocus(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    wrapperRef,
    selectedElement,
    onSelect,
    setSearchedValue,
    setFocus,
    focussed,
  ]);
  const validationError =
    filteredElements.length === 0 && searchedValue.length > 0
      ? 'Unsupported element, please try clearing your text to see the list of elements.'
      : '';
  return (
    <FlexColumn ref={wrapperRef}>
      <Tooltip title={validationError} options={{position: 'below'}}>
        <SearchBox isInvalidInput={validationError.length > 0}>
          <SearchIcon
            name="magnifying-glass"
            color={colors.macOSTitleBarIcon}
            size={16}
          />
          <StyledSearchInput
            placeholder={'Search Groups'}
            onChange={onChangeCallBack}
            onFocus={onFocusCallBack}
            value={searchedValue}
            isValidInput={false}
            data-testid={'search-input'}
          />
        </SearchBox>
      </Tooltip>
      {filteredElements.length > 0 && focussed && (
        <OverlayContainer>
          <ListViewContainer scrollable={true}>
            {filteredElements.map((e, idx) => {
              return (
                <FlexColumn key={idx}>
                  <RowComponent
                    elem={e}
                    onClick={onSelectCallBack}
                    selected={selectedElement && e.id == selectedElement.id}
                  />
                  {idx < filteredElements.length - 1 && <Separator />}
                </FlexColumn>
              );
            })}
          </ListViewContainer>
        </OverlayContainer>
      )}
    </FlexColumn>
  );
}
