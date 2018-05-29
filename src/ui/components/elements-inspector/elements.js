/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  ElementID,
  Element,
  ElementSearchResultSet,
} from './ElementsInspector.js';
import {reportInteraction} from '../../../utils/InteractionTracker';
import ContextMenu from '../ContextMenu.js';
import {PureComponent} from 'react';
import FlexRow from '../FlexRow.js';
import FlexColumn from '../FlexColumn.js';
import Glyph from '../Glyph.js';
import {colors} from '../colors.js';
import Text from '../Text.js';
import styled from '../../styled/index.js';
import {FixedList} from '../../virtualized/index.js';
import {clipboard} from 'electron';

const ROW_HEIGHT = 23;

const ElementsRowContainer = ContextMenu.extends(
  {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: props => {
      if (props.selected) {
        return colors.macOSTitleBarIconSelected;
      } else if (props.even) {
        return colors.light02;
      } else {
        return '';
      }
    },
    color: props => (props.selected ? colors.white : colors.grapeDark3),
    flexShrink: 0,
    flexWrap: 'nowrap',
    height: ROW_HEIGHT,
    minWidth: '100%',
    paddingLeft: props => (props.level - 1) * 12,
    paddingRight: 20,
    position: 'relative',

    '& *': {
      color: props => (props.selected ? `${colors.white} !important` : ''),
    },

    '&:hover': {
      backgroundColor: props =>
        props.selected ? colors.macOSTitleBarIconSelected : '#EBF1FB',
    },
  },
  {
    ignoreAttributes: ['level', 'selected', 'even'],
  },
);

const ElementsRowDecoration = FlexRow.extends({
  flexShrink: 0,
  justifyContent: 'flex-end',
  alignItems: 'center',
  marginRight: 4,
  position: 'relative',
  width: 16,
  top: -1,
});

const ElementsLine = styled.view(
  {
    backgroundColor: colors.light20,
    height: props => props.childrenCount * ROW_HEIGHT - 4,
    position: 'absolute',
    right: 3,
    top: ROW_HEIGHT - 3,
    zIndex: 2,
    width: 2,
    borderRadius: '999em',
  },
  {
    ignoreAttributes: ['childrenCount'],
  },
);

const DecorationImage = styled.image({
  height: 12,
  marginRight: 5,
  width: 12,
});

const NoShrinkText = Text.extends({
  flexShrink: 0,
  flexWrap: 'nowrap',
  overflow: 'hidden',
  userSelect: 'none',
  fontWeight: 400,
});

const ElementsRowAttributeContainer = NoShrinkText.extends({
  color: colors.dark80,
  fontWeight: 300,
  marginLeft: 5,
});

const ElementsRowAttributeKey = styled.text({
  color: colors.tomato,
});

const ElementsRowAttributeValue = styled.text({
  color: colors.slateDark3,
});

class PartialHighlight extends PureComponent<{
  selected: boolean,
  highlighted: ?string,
  content: string,
}> {
  static HighlightedText = styled.text({
    backgroundColor: '#ffff33',
    color: props =>
      props.selected ? `${colors.grapeDark3} !important` : 'auto',
  });

  render() {
    const {highlighted, content, selected} = this.props;
    let renderedValue;
    if (
      content &&
      highlighted != null &&
      highlighted != '' &&
      content.toLowerCase().includes(highlighted.toLowerCase())
    ) {
      const highlightStart = content
        .toLowerCase()
        .indexOf(highlighted.toLowerCase());
      const highlightEnd = highlightStart + highlighted.length;
      const before = content.substring(0, highlightStart);
      const match = content.substring(highlightStart, highlightEnd);
      const after = content.substring(highlightEnd);
      renderedValue = [
        <span>
          {before}
          <PartialHighlight.HighlightedText selected={selected}>
            {match}
          </PartialHighlight.HighlightedText>
          {after}
        </span>,
      ];
    } else {
      renderedValue = <span>{content}</span>;
    }
    return renderedValue;
  }
}

class ElementsRowAttribute extends PureComponent<{
  name: string,
  value: string,
  matchingSearchQuery: ?string,
  selected: boolean,
}> {
  render() {
    const {name, value, matchingSearchQuery, selected} = this.props;
    return (
      <ElementsRowAttributeContainer code={true}>
        <ElementsRowAttributeKey>{name}</ElementsRowAttributeKey>
        =
        <ElementsRowAttributeValue>
          <PartialHighlight
            content={value}
            highlighted={
              name === 'id' || name === 'addr' ? matchingSearchQuery : ''
            }
            selected={selected}
          />
        </ElementsRowAttributeValue>
      </ElementsRowAttributeContainer>
    );
  }
}

type FlatElement = {|
  key: ElementID,
  element: Element,
  level: number,
|};

type FlatElements = Array<FlatElement>;

type ElementsRowProps = {
  id: ElementID,
  level: number,
  selected: boolean,
  matchingSearchQuery: ?string,
  element: Element,
  even: boolean,
  onElementSelected: (key: ElementID) => void,
  onElementExpanded: (key: ElementID, deep: boolean) => void,
  childrenCount: number,
  onElementHovered: ?(key: ?ElementID) => void,
  style: ?Object,
};

type ElementsRowState = {|
  hovered: boolean,
|};

class ElementsRow extends PureComponent<ElementsRowProps, ElementsRowState> {
  constructor(props: ElementsRowProps, context: Object) {
    super(props, context);
    this.state = {hovered: false};
    this.interaction = reportInteraction('ElementsRow', props.element.name);
  }

  interaction: (name: string, data: any) => void;

  getContextMenu = (): Array<Electron$MenuItemOptions> => {
    const {props} = this;
    return [
      {
        type: 'separator',
      },
      {
        label: 'Copy',
        click: () => {
          clipboard.writeText(props.element.name);
        },
      },
      {
        label: props.element.expanded ? 'Collapse' : 'Expand',
        click: () => {
          this.props.onElementExpanded(this.props.id, false);
        },
      },
    ];
  };

  onClick = () => {
    this.props.onElementSelected(this.props.id);
    this.interaction('selected', {level: this.props.level});
  };

  onDoubleClick = (event: SyntheticMouseEvent<*>) => {
    this.props.onElementExpanded(this.props.id, event.altKey);
  };

  onMouseEnter = () => {
    this.setState({hovered: true});
    if (this.props.onElementHovered) {
      this.props.onElementHovered(this.props.id);
    }
  };

  onMouseLeave = () => {
    this.setState({hovered: false});
    if (this.props.onElementHovered) {
      this.props.onElementHovered(null);
    }
  };

  render() {
    const {
      element,
      id,
      level,
      selected,
      style,
      even,
      matchingSearchQuery,
    } = this.props;
    const hasChildren = element.children && element.children.length > 0;

    let arrow;
    if (hasChildren) {
      arrow = (
        <span onClick={this.onDoubleClick} role="button" tabIndex={-1}>
          <Glyph
            size={8}
            name={element.expanded ? 'chevron-down' : 'chevron-right'}
            color={selected ? 'white' : colors.light80}
          />
        </span>
      );
    }

    const attributes = element.attributes
      ? element.attributes.map(attr => (
          <ElementsRowAttribute
            key={attr.name}
            name={attr.name}
            value={attr.value}
            matchingSearchQuery={matchingSearchQuery}
            selected={selected}
          />
        ))
      : [];

    const decoration = (() => {
      switch (element.decoration) {
        case 'litho':
          return <DecorationImage src="icons/litho-logo.png" />;
        case 'componentkit':
          return <DecorationImage src="icons/componentkit-logo.png" />;
        case 'componentscript':
          return <DecorationImage src="icons/componentscript-logo.png" />;
        default:
          return null;
      }
    })();

    // when we hover over or select an expanded element with children, we show a line from the
    // bottom of the element to the next sibling
    let line;
    const shouldShowLine =
      (selected || this.state.hovered) && hasChildren && element.expanded;
    if (shouldShowLine) {
      line = <ElementsLine childrenCount={this.props.childrenCount} />;
    }

    return (
      <ElementsRowContainer
        buildItems={this.getContextMenu}
        key={id}
        level={level}
        selected={selected}
        matchingSearchQuery={matchingSearchQuery}
        even={even}
        onClick={this.onClick}
        onDoubleClick={this.onDoubleClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        style={style}>
        <ElementsRowDecoration>
          {line}
          {arrow}
        </ElementsRowDecoration>
        <NoShrinkText code={true}>
          {decoration}
          <PartialHighlight
            content={element.name}
            highlighted={matchingSearchQuery}
            selected={selected}
          />
        </NoShrinkText>
        {attributes}
      </ElementsRowContainer>
    );
  }
}

const ElementsContainer = FlexColumn.extends({
  backgroundColor: colors.white,
  minHeight: '100%',
  minWidth: '100%',
  overflow: 'auto',
});

const ElementsBox = FlexColumn.extends({
  alignItems: 'flex-start',
  flex: 1,
  overflow: 'auto',
});

type ElementsProps = {|
  root: ?ElementID,
  selected: ?ElementID,
  searchResults: ?ElementSearchResultSet,
  elements: {[key: ElementID]: Element},
  onElementSelected: (key: ElementID) => void,
  onElementExpanded: (key: ElementID, deep: boolean) => void,
  onElementHovered: ?(key: ?ElementID) => void,
|};

type ElementsState = {|
  flatKeys: Array<ElementID>,
  flatElements: FlatElements,
  maxDepth: number,
|};

export class Elements extends PureComponent<ElementsProps, ElementsState> {
  constructor(props: ElementsProps, context: Object) {
    super(props, context);
    this.state = {
      flatElements: [],
      flatKeys: [],
      maxDepth: 0,
    };
  }

  componentDidMount() {
    this.setProps(this.props, true);
  }

  componentWillReceiveProps(nextProps: ElementsProps) {
    this.setProps(nextProps);
  }

  setProps(props: ElementsProps, force?: boolean) {
    const flatElements: FlatElements = [];
    const flatKeys = [];

    let maxDepth = 0;

    function seed(key: ElementID, level: number) {
      const element = props.elements[key];
      if (!element) {
        return;
      }

      maxDepth = Math.max(maxDepth, level);

      flatElements.push({
        element,
        key,
        level,
      });

      flatKeys.push(key);

      if (
        element.children != null &&
        element.children.length > 0 &&
        element.expanded
      ) {
        for (const key of element.children) {
          seed(key, level + 1);
        }
      }
    }

    if (props.root != null) {
      seed(props.root, 1);
    }

    this.setState({flatElements, flatKeys, maxDepth});
  }

  selectElement = (key: ElementID) => {
    this.props.onElementSelected(key);
  };

  onKeyDown = (e: SyntheticKeyboardEvent<*>) => {
    const {selected} = this.props;
    if (selected == null) {
      return;
    }

    const {props} = this;
    const {flatElements, flatKeys} = this.state;

    const selectedIndex = flatKeys.indexOf(selected);
    if (selectedIndex < 0) {
      return;
    }

    const selectedElement = props.elements[selected];
    if (!selectedElement) {
      return;
    }

    if (
      e.key === 'c' &&
      ((e.metaKey && process.platform === 'darwin') ||
        (e.ctrlKey && process.platform !== 'darwin'))
    ) {
      e.preventDefault();
      clipboard.writeText(selectedElement.name);
      return;
    }

    if (e.key === 'ArrowUp') {
      if (selectedIndex === 0 || flatKeys.length === 1) {
        return;
      }

      e.preventDefault();
      this.selectElement(flatKeys[selectedIndex - 1]);
    }

    if (e.key === 'ArrowDown') {
      if (selectedIndex === flatKeys.length - 1) {
        return;
      }

      e.preventDefault();
      this.selectElement(flatKeys[selectedIndex + 1]);
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (selectedElement.expanded) {
        // unexpand
        props.onElementExpanded(selected, false);
      } else {
        // jump to parent
        let parentKey;
        const targetLevel = flatElements[selectedIndex].level - 1;
        for (let i = selectedIndex; i >= 0; i--) {
          const {level} = flatElements[i];
          if (level === targetLevel) {
            parentKey = flatKeys[i];
            break;
          }
        }

        if (parentKey) {
          this.selectElement(parentKey);
        }
      }
    }

    if (e.key === 'ArrowRight' && selectedElement.children.length > 0) {
      e.preventDefault();
      if (selectedElement.expanded) {
        // go to first child
        this.selectElement(selectedElement.children[0]);
      } else {
        // expand
        props.onElementExpanded(selected, false);
      }
    }
  };

  buildRow = ({index, style}: {index: number, style: Object}) => {
    const {
      elements,
      onElementExpanded,
      onElementHovered,
      onElementSelected,
      selected,
      searchResults,
    } = this.props;
    const {flatElements} = this.state;
    const row = flatElements[index];

    let childrenCount = 0;
    for (let i = index + 1; i < flatElements.length; i++) {
      const child = flatElements[i];
      if (child.level <= row.level) {
        break;
      } else {
        childrenCount++;
      }
    }

    return (
      <ElementsRow
        level={row.level}
        id={row.key}
        key={row.key}
        even={index % 2 === 0}
        onElementExpanded={onElementExpanded}
        onElementHovered={onElementHovered}
        onElementSelected={onElementSelected}
        selected={selected === row.key}
        matchingSearchQuery={
          searchResults && searchResults.matches.has(row.key)
            ? searchResults.query
            : null
        }
        element={row.element}
        elements={elements}
        childrenCount={childrenCount}
        style={style}
      />
    );
  };

  keyMapper = (index: number): string => {
    return this.state.flatElements[index].key;
  };

  render() {
    const items = this.state.flatElements;

    return (
      <ElementsBox>
        <ElementsContainer tabIndex="0" onKeyDown={this.onKeyDown}>
          <FixedList
            pureData={items}
            keyMapper={this.keyMapper}
            rowCount={items.length}
            rowHeight={ROW_HEIGHT}
            rowRenderer={this.buildRow}
            sideScrollable={true}
          />
        </ElementsContainer>
      </ElementsBox>
    );
  }
}
