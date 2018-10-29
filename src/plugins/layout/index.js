/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {ElementID, Element, ElementSearchResultSet} from 'flipper';
import {
  colors,
  Glyph,
  FlexRow,
  FlexColumn,
  Toolbar,
  FlipperPlugin,
  ElementsInspector,
  InspectorSidebar,
  LoadingIndicator,
  styled,
  Component,
  SearchBox,
  SearchInput,
  SearchIcon,
  DetailSidebar,
  VerticalRule,
  Popover,
  ToggleButton,
  SidebarExtensions,
} from 'flipper';

import type {TrackType} from '../../fb-stubs/Logger.js';

import debounce from 'lodash.debounce';

export type InspectorState = {|
  initialised: boolean,
  selected: ?ElementID,
  root: ?ElementID,
  elements: {[key: ElementID]: Element},
  isSearchActive: boolean,
  searchResults: ?ElementSearchResultSet,
  outstandingSearchQuery: ?string,
  // properties for ax mode
  AXinitialised: boolean,
  AXselected: ?ElementID,
  AXfocused: ?ElementID,
  AXroot: ?ElementID,
  AXelements: {[key: ElementID]: Element},
  inAXMode: boolean,
  forceLithoAXRender: boolean,
  AXtoNonAXMapping: {[key: ElementID]: ElementID},
  accessibilitySettingsOpen: boolean,
  showLithoAccessibilitySettings: boolean,
  //
  isAlignmentMode: boolean,
  logCounter: number,
|};

type SelectElementArgs = {|
  key: ElementID,
  AXkey: ElementID,
|};

type ExpandElementArgs = {|
  key: ElementID,
  expand: boolean,
|};

type ExpandElementsArgs = {|
  elements: Array<ElementID>,
|};

type UpdateElementsArgs = {|
  elements: Array<$Shape<Element>>,
|};

type UpdateAXElementsArgs = {|
  elements: Array<$Shape<Element>>,
  forFocusEvent: boolean,
|};

type AXFocusEventResult = {|
  isFocus: boolean,
  isClick?: boolean,
|};

type SetRootArgs = {|
  root: ElementID,
|};

type GetNodesResult = {|
  elements: Array<Element>,
|};

type GetNodesOptions = {|
  force: boolean,
  ax: boolean,
  forAccessibilityEvent?: boolean,
|};

type TrackArgs = {|
  type: TrackType,
  eventName: string,
  data?: any,
|};

type SearchResultTree = {|
  id: string,
  isMatch: Boolean,
  children: ?Array<SearchResultTree>,
  element: Element,
  axElement: Element,
|};

const LoadingSpinner = styled(LoadingIndicator)({
  marginRight: 4,
  marginLeft: 3,
  marginTop: -1,
});

const Center = styled(FlexRow)({
  alignItems: 'center',
  justifyContent: 'center',
});

const SearchIconContainer = styled('div')({
  marginRight: 9,
  marginTop: -3,
  marginLeft: 4,
  position: 'relative', // for settings popover positioning
});

const SettingsItem = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
});

const SettingsLabel = styled('div')({
  marginLeft: 5,
  marginRight: 15,
});

class LayoutSearchInput extends Component<
  {
    onSubmit: string => void,
  },
  {
    value: string,
  },
> {
  static TextInput = styled('input')({
    width: '100%',
    marginLeft: 6,
  });

  state = {
    value: '',
  };

  timer: TimeoutID;

  onChange = (e: SyntheticInputEvent<>) => {
    clearTimeout(this.timer);
    this.setState({
      value: e.target.value,
    });
    this.timer = setTimeout(() => this.props.onSubmit(this.state.value), 200);
  };

  onKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Enter') {
      this.props.onSubmit(this.state.value);
    }
  };

  render() {
    return (
      <SearchInput
        placeholder={'Search'}
        onChange={this.onChange}
        onKeyDown={this.onKeyDown}
        value={this.state.value}
      />
    );
  }
}

export default class Layout extends FlipperPlugin<InspectorState> {
  static title = 'Layout';
  static id = 'Inspector';
  static icon = 'target';

  state = {
    elements: {},
    initialised: false,
    isSearchActive: false,
    root: null,
    selected: null,
    searchResults: null,
    outstandingSearchQuery: null,
    // properties for ax mode
    inAXMode: false,
    forceLithoAXRender: true,
    AXelements: {},
    AXinitialised: false,
    AXroot: null,
    AXselected: null,
    AXfocused: null,
    accessibilitySettingsOpen: false,
    AXtoNonAXMapping: {},
    showLithoAccessibilitySettings: false,
    //
    isAlignmentMode: false,
    logCounter: 0,
  };

  reducers = {
    SelectElement(state: InspectorState, {key, AXkey}: SelectElementArgs) {
      return {
        selected: key,
        AXselected: AXkey,
      };
    },

    ExpandElement(state: InspectorState, {expand, key}: ExpandElementArgs) {
      return {
        elements: {
          ...state.elements,
          [key]: {
            ...state.elements[key],
            expanded: expand,
          },
        },
      };
    },

    ExpandAXElement(state: InspectorState, {expand, key}: ExpandElementArgs) {
      return {
        AXelements: {
          ...state.AXelements,
          [key]: {
            ...state.AXelements[key],
            expanded: expand,
          },
        },
      };
    },

    ExpandElements(state: InspectorState, {elements}: ExpandElementsArgs) {
      const expandedSet = new Set(elements);
      const newState = {
        elements: {
          ...state.elements,
        },
      };
      for (const key of Object.keys(state.elements)) {
        newState.elements[key] = {
          ...newState.elements[key],
          expanded: expandedSet.has(key),
        };
      }
      return newState;
    },

    ExpandAXElements(state: InspectorState, {elements}: ExpandElementsArgs) {
      const expandedSet = new Set(elements);
      const newState = {
        AXelements: {
          ...state.AXelements,
        },
      };
      for (const key of Object.keys(state.AXelements)) {
        newState.AXelements[key] = {
          ...newState.AXelements[key],
          expanded: expandedSet.has(key),
        };
      }
      return newState;
    },

    UpdateElements(state: InspectorState, {elements}: UpdateElementsArgs) {
      const updatedElements = state.elements;
      const updatedMapping = state.AXtoNonAXMapping;

      for (const element of elements) {
        const current = updatedElements[element.id] || {};
        updatedElements[element.id] = {
          ...current,
          ...element,
        };
        const linked = element.extraInfo && element.extraInfo.linkedAXNode;
        if (linked && !updatedMapping[linked]) {
          updatedMapping[linked] = element.id;
        }
      }

      return {elements: updatedElements, AXtoNonAXMapping: updatedMapping};
    },

    UpdateAXElements(
      state: InspectorState,
      {elements, forFocusEvent}: UpdateAXElementsArgs,
    ) {
      const updatedElements = state.AXelements;

      // if focusEvent, previously focused element can be reset
      let updatedFocus = forFocusEvent ? null : state.AXfocused;

      for (const element of elements) {
        if (element.extraInfo && element.extraInfo.focused) {
          updatedFocus = element.id;
        }
        const current = updatedElements[element.id] || {};
        updatedElements[element.id] = {
          ...current,
          ...element,
        };
      }

      return {
        AXelements: updatedElements,
        AXfocused: updatedFocus,
      };
    },

    SetRoot(state: InspectorState, {root}: SetRootArgs) {
      return {root};
    },

    SetAXRoot(state: InspectorState, {root}: SetRootArgs) {
      return {AXroot: root};
    },

    SetSearchActive(
      state: InspectorState,
      {isSearchActive}: {isSearchActive: boolean},
    ) {
      return {isSearchActive};
    },

    SetAlignmentActive(
      state: InspectorState,
      {isAlignmentMode}: {isAlignmentMode: boolean},
    ) {
      return {isAlignmentMode};
    },

    SetAXMode(state: InspectorState, {inAXMode}: {inAXMode: boolean}) {
      return {inAXMode};
    },

    SetLithoRenderMode(
      state: InspectorState,
      {forceLithoAXRender}: {forceLithoAXRender: boolean},
    ) {
      return {forceLithoAXRender};
    },

    SetAccessibilitySettingsOpen(
      state: InspectorState,
      {accessibilitySettingsOpen}: {accessibilitySettingsOpen: boolean},
    ) {
      return {accessibilitySettingsOpen};
    },
  };

  search(query: string) {
    this.setState({
      outstandingSearchQuery: query,
    });

    if (!query) {
      this.displaySearchResults({query: '', results: null});
    } else {
      this.client
        .call('getSearchResults', {query: query, axEnabled: this.axEnabled()})
        .then(response => this.displaySearchResults(response));
    }
  }

  executeCommand(command: string) {
    return this.client.call('executeCommand', {
      command: command,
      context: this.state.inAXMode
        ? this.state.AXselected
        : this.state.selected,
    });
  }

  /**
   * When opening the inspector for the first time, expand all elements that contain only 1 child
   * recursively.
   */
  async performInitialExpand(element: Element, ax: boolean): Promise<void> {
    if (!element.children.length) {
      // element has no children so we're as deep as we can be
      return;
    }

    this.dispatchAction({
      expand: true,
      key: element.id,
      type: ax ? 'ExpandAXElement' : 'ExpandElement',
    });

    return this.getChildren(element.id, ax).then((elements: Array<Element>) => {
      this.dispatchAction({
        elements,
        type: ax ? 'UpdateAXElements' : 'UpdateElements',
      });

      if (element.children.length >= 2) {
        // element has two or more children so we can stop expanding
        return;
      }

      return this.performInitialExpand(
        (ax ? this.state.AXelements : this.state.elements)[element.children[0]],
        ax,
      );
    });
  }

  displaySearchResults({
    results,
    query,
  }: {
    results: ?SearchResultTree,
    query: string,
  }) {
    const elements = this.getElementsFromSearchResultTree(results);
    const idsToExpand = elements
      .filter(x => x.hasChildren)
      .map(x => x.element.id);

    const finishedSearching = query === this.state.outstandingSearchQuery;

    this.dispatchAction({
      elements: elements.map(x => x.element),
      type: 'UpdateElements',
    });

    this.dispatchAction({
      elements: idsToExpand,
      type: 'ExpandElements',
    });

    if (this.axEnabled()) {
      const AXelements = elements.filter(x => x.axElement);
      const AXidsToExpand = AXelements.filter(x => x.hasChildren).map(
        x => x.axElement.id,
      );

      this.dispatchAction({
        elements: AXelements.map(x => x.axElement),
        type: 'UpdateAXElements',
      });

      this.dispatchAction({
        elements: AXidsToExpand,
        type: 'ExpandAXElements',
      });
    }

    this.setState({
      searchResults: {
        matches: new Set(
          elements.filter(x => x.isMatch).map(x => x.element.id),
        ),
        query: query,
      },
      outstandingSearchQuery: finishedSearching
        ? null
        : this.state.outstandingSearchQuery,
    });
  }

  getElementsFromSearchResultTree(tree: ?SearchResultTree) {
    if (!tree) {
      return [];
    }
    var elements = [
      {
        id: tree.id,
        isMatch: tree.isMatch,
        hasChildren: Boolean(tree.children),
        element: tree.element,
        axElement: tree.axElement,
      },
    ];
    if (tree.children) {
      for (const child of tree.children) {
        elements = elements.concat(this.getElementsFromSearchResultTree(child));
      }
    }
    return elements;
  }

  axEnabled(): boolean {
    // only visible internally for Android clients
    return this.realClient.query.os === 'Android';
  }

  // expand tree and highlight click-to-inspect node that was found
  onSelectResultsRecieved(path: Array<ElementID>, ax: boolean) {
    this.getNodesAndDirectChildren(path, ax).then(
      (elements: Array<Element>) => {
        const selected = path[path.length - 1];

        this.dispatchAction({
          elements,
          type: ax ? 'UpdateAXElements' : 'UpdateElements',
        });

        // select node from ax tree if in ax mode
        // select node from main tree if not in ax mode
        // (also selects corresponding node in other tree if it exists)
        if ((ax && this.state.inAXMode) || (!ax && !this.state.inAXMode)) {
          const {key, AXkey} = this.getKeysFromSelected(selected);
          this.dispatchAction({key, AXkey, type: 'SelectElement'});
        }

        this.dispatchAction({
          isSearchActive: false,
          type: 'SetSearchActive',
        });

        for (const key of path) {
          this.dispatchAction({
            expand: true,
            key,
            type: ax ? 'ExpandAXElement' : 'ExpandElement',
          });
        }

        this.client.send('setHighlighted', {
          id: selected,
          isAlignmentMode: this.state.isAlignmentMode,
        });

        this.client.send('setSearchActive', {active: false});
      },
    );
  }

  initAX() {
    // TODO: uncomment once Litho open source updates
    // this.client
    //   .call('shouldShowLithoAccessibilitySettings')
    //   .then((showLithoAccessibilitySettings: boolean) => {
    //     this.setState({
    //       showLithoAccessibilitySettings,
    //     });
    //   });

    performance.mark('InitAXRoot');
    this.client.call('getAXRoot').then((element: Element) => {
      this.dispatchAction({elements: [element], type: 'UpdateAXElements'});
      this.dispatchAction({root: element.id, type: 'SetAXRoot'});
      this.performInitialExpand(element, true).then(() => {
        this.props.logger.trackTimeSince('InitAXRoot', 'accessibility:getRoot');
        this.setState({AXinitialised: true});
      });
    });

    this.client.subscribe(
      'axFocusEvent',
      ({isFocus, isClick}: AXFocusEventResult) => {
        this.props.logger.track('usage', 'accessibility:focusEvent', {
          isFocus,
          isClick,
          inAXMode: this.state.inAXMode,
        });

        // if focusing, need to update all elements in the tree because
        // we don't know which one now has focus
        const keys = isFocus ? Object.keys(this.state.AXelements) : [];

        // if unfocusing, update only the focused and selected elements and
        // only if they have been loaded into tree
        if (!isFocus) {
          if (
            this.state.AXfocused &&
            this.state.AXelements[this.state.AXfocused]
          ) {
            keys.push(this.state.AXfocused);
          }

          // also update current selected element live, so data shown is not invalid
          if (
            this.state.AXselected &&
            this.state.AXelements[this.state.AXselected]
          ) {
            keys.push(this.state.AXselected);
          }
        }

        this.getNodes(keys, {
          force: true,
          ax: true,
          forAccessibilityEvent: true,
        }).then((elements: Array<Element>) => {
          this.dispatchAction({
            elements,
            forFocusEvent: !isClick,
            type: 'UpdateAXElements',
          });
        });
      },
    );

    this.client.subscribe(
      'invalidateAX',
      ({nodes}: {nodes: Array<{id: ElementID}>}) => {
        this.invalidate(nodes.map(node => node.id), true).then(
          (elements: Array<Element>) => {
            this.dispatchAction({elements, type: 'UpdateAXElements'});
          },
        );
      },
    );

    this.client.subscribe('selectAX', ({path}: {path: Array<ElementID>}) => {
      if (this.state.inAXMode) {
        this.props.logger.track('usage', 'accessibility:clickToInspect');
      }
      this.onSelectResultsRecieved(path, true);
    });

    this.client.subscribe('track', ({type, eventName, data}: TrackArgs) => {
      this.props.logger.track(type, eventName, data);
    });
  }

  init() {
    // persist searchActive state when moving between plugins to prevent multiple
    // TouchOverlayViews since we can't edit the view heirarchy in onDisconnect
    this.client.call('isSearchActive').then(({isSearchActive}) => {
      this.dispatchAction({type: 'SetSearchActive', isSearchActive});
    });

    performance.mark('LayoutInspectorInitialize');
    this.client.call('getRoot').then((element: Element) => {
      this.dispatchAction({elements: [element], type: 'UpdateElements'});
      this.dispatchAction({root: element.id, type: 'SetRoot'});
      this.performInitialExpand(element, false).then(() => {
        this.props.logger.trackTimeSince('LayoutInspectorInitialize');
        this.setState({initialised: true});
      });
    });

    this.client.subscribe(
      'invalidate',
      ({nodes}: {nodes: Array<{id: ElementID}>}) => {
        this.invalidate(nodes.map(node => node.id), false).then(
          (elements: Array<Element>) => {
            this.dispatchAction({elements, type: 'UpdateElements'});
          },
        );
      },
    );

    this.client.subscribe('select', ({path}: {path: Array<ElementID>}) => {
      this.onSelectResultsRecieved(path, false);
    });

    if (this.axEnabled()) {
      this.props.logger.track('usage', 'accessibility:init');
      this.initAX();
    }
  }

  invalidate(ids: Array<ElementID>, ax: boolean): Promise<Array<Element>> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.getNodes(ids, {force: true, ax}).then(
      (elements: Array<Element>) => {
        const children = elements
          .filter(element => {
            const prev = (ax ? this.state.AXelements : this.state.elements)[
              element.id
            ];
            return prev && prev.expanded;
          })
          .map(element => element.children)
          .reduce((acc, val) => acc.concat(val), []);

        return Promise.all([elements, this.invalidate(children, ax)]).then(
          arr => {
            return arr.reduce((acc, val) => acc.concat(val), []);
          },
        );
      },
    );
  }

  getNodesAndDirectChildren(
    ids: Array<ElementID>,
    ax: boolean,
  ): Promise<Array<Element>> {
    return this.getNodes(ids, {force: false, ax}).then(
      (elements: Array<Element>) => {
        const children = elements
          .map(element => element.children)
          .reduce((acc, val) => acc.concat(val), []);

        return Promise.all([
          elements,
          this.getNodes(children, {force: false, ax}),
        ]).then(arr => {
          return arr.reduce((acc, val) => acc.concat(val), []);
        });
      },
    );
  }

  getChildren(key: ElementID, ax: boolean): Promise<Array<Element>> {
    return this.getNodes(
      (ax ? this.state.AXelements : this.state.elements)[key].children,
      {force: false, ax},
    );
  }

  getNodes(
    ids: Array<ElementID> = [],
    options: GetNodesOptions,
  ): Promise<Array<Element>> {
    const {force, ax, forAccessibilityEvent} = options;
    if (!force) {
      const elems = ax ? this.state.AXelements : this.state.elements;
      // always force undefined elements and elements that need to be expanded
      // over in the main tree (e.g. fragments)
      ids = ids.filter(id => {
        return (
          !elems[id] ||
          (elems[id].extraInfo && elems[id].extraInfo.nonAXWithAXChild)
        );
      });
    }

    if (ids.length > 0) {
      // prevents overlapping calls from interfering with each other's logging
      const mark = 'LayoutInspectorGetNodes' + this.state.logCounter++;
      const eventName = ax
        ? 'accessibility:getNodes'
        : 'LayoutInspectorGetNodes';

      performance.mark(mark);
      return this.client
        .call(ax ? 'getAXNodes' : 'getNodes', {
          ids,
          forAccessibilityEvent,
          selected: this.state.AXselected,
        })
        .then(({elements}: GetNodesResult) => {
          this.props.logger.trackTimeSince(mark, eventName);
          return Promise.resolve(elements);
        });
    } else {
      return Promise.resolve([]);
    }
  }

  isExpanded(key: ElementID, ax: boolean): boolean {
    return ax
      ? this.state.AXelements[key].expanded
      : this.state.elements[key].expanded;
  }

  expandElement = (key: ElementID, ax: boolean): Promise<Array<Element>> => {
    const expand = !this.isExpanded(key, ax);
    return this.setElementExpanded(key, expand, ax);
  };

  setElementExpanded = (
    key: ElementID,
    expand: boolean,
    ax: boolean,
  ): Promise<Array<Element>> => {
    this.dispatchAction({
      expand,
      key,
      type: ax ? 'ExpandAXElement' : 'ExpandElement',
    });

    const mark = ax ? 'ExpandAXElement' : 'LayoutInspectorExpandElement';
    const eventName = ax
      ? 'accessibility:expandElement'
      : 'LayoutInspectorExpandElement';

    performance.mark(mark);
    if (expand) {
      return this.getChildren(key, ax).then((elements: Array<Element>) => {
        this.dispatchAction({
          elements,
          type: ax ? 'UpdateAXElements' : 'UpdateElements',
        });
        this.props.logger.trackTimeSince(mark, eventName);

        // only expand extra components in the main tree when in AX mode
        if (this.state.inAXMode && !ax) {
          // expand child wrapper elements that aren't in the AX tree (e.g. fragments)
          for (const childElem of elements) {
            if (childElem.extraInfo && childElem.extraInfo.nonAXWithAXChild) {
              this.setElementExpanded(childElem.id, true, false);
            }
          }
        }
        return Promise.resolve(elements);
      });
    } else {
      return Promise.resolve([]);
    }
  };

  deepExpandElement = async (key: ElementID, ax: boolean) => {
    const expand = !this.isExpanded(key, ax);
    if (!expand) {
      // we never deep unexpand
      return this.setElementExpanded(key, false, ax);
    }

    // queue of keys to open
    const keys = [key];

    // amount of elements we've expanded, we stop at 100 just to be safe
    let count = 0;

    while (keys.length && count < 100) {
      const key = keys.shift();

      // expand current element
      const children = await this.setElementExpanded(key, true, ax);

      // and add its children to the queue
      for (const child of children) {
        keys.push(child.id);
      }

      count++;
    }
  };

  onElementExpanded = (key: ElementID, deep: boolean) => {
    if (this.state.elements[key]) {
      if (deep) {
        this.deepExpandElement(key, false);
      } else {
        this.expandElement(key, false);
      }
      this.props.logger.track('usage', 'layout:element-expanded', {
        id: key,
        deep: deep,
      });
    }

    if (this.state.AXelements[key]) {
      if (deep) {
        this.deepExpandElement(key, true);
      } else {
        this.expandElement(key, true);
      }
      if (this.state.inAXMode) {
        this.props.logger.track('usage', 'accessibility:elementExpanded', {
          id: key,
          deep: deep,
        });
      }
    }
  };

  onFindClick = () => {
    const isSearchActive = !this.state.isSearchActive;
    this.dispatchAction({isSearchActive, type: 'SetSearchActive'});
    this.client.send('setSearchActive', {active: isSearchActive});
  };

  onToggleAccessibility = () => {
    const inAXMode = !this.state.inAXMode;
    const {
      forceLithoAXRender,
      AXroot,
      showLithoAccessibilitySettings,
    } = this.state;
    this.props.logger.track('usage', 'accessibility:modeToggled', {inAXMode});
    this.dispatchAction({inAXMode, type: 'SetAXMode'});

    // only force render if litho accessibility is included in app
    if (showLithoAccessibilitySettings) {
      this.client.send('forceLithoAXRender', {
        forceLithoAXRender: inAXMode && forceLithoAXRender,
        applicationId: AXroot,
      });
    }
  };

  onToggleForceLithoAXRender = () => {
    // only force render if litho accessibility is included in app
    if (this.state.showLithoAccessibilitySettings) {
      const forceLithoAXRender = !this.state.forceLithoAXRender;
      const applicationId = this.state.AXroot;
      this.dispatchAction({forceLithoAXRender, type: 'SetLithoRenderMode'});
      this.client.send('forceLithoAXRender', {
        forceLithoAXRender: forceLithoAXRender,
        applicationId,
      });
    }
  };

  onOpenAccessibilitySettings = () => {
    this.dispatchAction({
      accessibilitySettingsOpen: true,
      type: 'SetAccessibilitySettingsOpen',
    });
  };

  onCloseAccessibilitySettings = () => {
    this.dispatchAction({
      accessibilitySettingsOpen: false,
      type: 'SetAccessibilitySettingsOpen',
    });
  };

  onToggleAlignment = () => {
    const isAlignmentMode = !this.state.isAlignmentMode;
    this.dispatchAction({isAlignmentMode, type: 'SetAlignmentActive'});
  };

  getKeysFromSelected(selectedKey: ElementID) {
    let key = selectedKey;
    let AXkey = null;

    if (this.axEnabled()) {
      const linkedAXNode =
        this.state.elements[selectedKey] &&
        this.state.elements[selectedKey].extraInfo &&
        this.state.elements[selectedKey].extraInfo.linkedAXNode;

      // element only in main tree with linkedAXNode selected
      if (linkedAXNode) {
        AXkey = linkedAXNode;

        // element only in AX tree with linked nonAX (litho) element selected
      } else if (
        !this.state.elements[selectedKey] ||
        this.state.elements[selectedKey].name === 'ComponentHost'
      ) {
        key = this.state.AXtoNonAXMapping[selectedKey] || null;
        AXkey = selectedKey;

        // keys are same for both trees or 'linked' element does not exist
      } else {
        AXkey = selectedKey;
      }
    }

    return {key, AXkey};
  }

  onElementSelected = debounce((selectedKey: ElementID) => {
    const {key, AXkey} = this.getKeysFromSelected(selectedKey);
    this.dispatchAction({key, AXkey, type: 'SelectElement'});

    this.client.send('setHighlighted', {
      id: selectedKey,
      isAlignmentMode: this.state.isAlignmentMode,
    });

    if (key) {
      this.getNodes([key], {force: true, ax: false}).then(
        (elements: Array<Element>) => {
          this.dispatchAction({elements, type: 'UpdateElements'});
        },
      );
    }

    if (AXkey) {
      this.getNodes([AXkey], {force: true, ax: true}).then(
        (elements: Array<Element>) => {
          this.dispatchAction({elements, type: 'UpdateAXElements'});
        },
      );
    }

    if (this.state.inAXMode) {
      this.props.logger.track('usage', 'accessibility:selectElement');
    }
  });

  onElementHovered = debounce((key: ?ElementID) => {
    this.client.send('setHighlighted', {
      id: key,
      isAlignmentMode: this.state.isAlignmentMode,
    });
  });

  getAXContextMenuExtensions() {
    return [
      {
        label: 'Focus',
        click: (id: ElementID) => {
          this.client.send('onRequestAXFocus', {id});
        },
      },
    ];
  }

  onDataValueChanged = (path: Array<string>, value: any) => {
    const ax = this.state.inAXMode;
    const id = ax ? this.state.AXselected : this.state.selected;
    this.client
      .call('setData', {id, path, value, ax})
      .then((element: Element) => {
        if (ax) {
          this.dispatchAction({
            elements: [element],
            type: 'UpdateAXElements',
          });
        }
      });

    const eventName = ax
      ? 'accessibility:dataValueChanged'
      : 'layout:value-changed';
    this.props.logger.track('usage', eventName, {
      id,
      value,
      path,
    });
  };

  // returns object with all sidebar elements that should show more information
  // on hover (needs to be kept up-to-date if names of properties change)
  getAccessibilityTooltips() {
    return {
      'accessibility-focused':
        'True if this element has the focus of an accessibility service',
      'content-description':
        'Text to label the content or functionality of this element ',
      'important-for-accessibility':
        'Marks this element as important to accessibility services; one of AUTO, YES, NO, NO_HIDE_DESCENDANTS',
      'talkback-focusable': 'True if Talkback can focus on this element',
      'talkback-focusable-reasons': 'Why Talkback can focus on this element',
      'talkback-ignored': 'True if Talkback cannot focus on this element',
      'talkback-ignored-reasons': 'Why Talkback cannot focus on the element',
      'talkback-output':
        'What Talkback will say when this element is focused (derived from role, content-description, and state of the element)',
      'talkback-hint':
        'What Talkback will say after output if hints are enabled',
    };
  }

  renderSidebar = () => {
    if (this.state.inAXMode) {
      // empty if no element selected w/in AX node tree
      return (
        this.state.AXselected && (
          <InspectorSidebar
            element={this.state.AXelements[this.state.AXselected]}
            tooltips={this.getAccessibilityTooltips()}
            onValueChanged={this.onDataValueChanged}
            client={this.client}
            logger={this.props.logger}
          />
        )
      );
    } else {
      // empty if no element selected w/in view tree
      return (
        this.state.selected != null && (
          <InspectorSidebar
            element={this.state.elements[this.state.selected]}
            onValueChanged={this.onDataValueChanged}
            client={this.client}
            logger={this.props.logger}
            extensions={SidebarExtensions}
          />
        )
      );
    }
  };

  getAccessibilitySettingsPopover(forceLithoAXRender: boolean) {
    return (
      <Popover
        onDismiss={this.onCloseAccessibilitySettings}
        forceOpts={{skewLeft: true, minWidth: 280}}>
        <SettingsItem>
          <ToggleButton
            onClick={this.onToggleForceLithoAXRender}
            toggled={forceLithoAXRender}
          />
          <SettingsLabel>Force Litho Accessibility Rendering</SettingsLabel>
        </SettingsItem>
      </Popover>
    );
  }

  render() {
    const {
      initialised,
      AXinitialised,
      selected,
      AXselected,
      AXfocused,
      root,
      AXroot,
      elements,
      AXelements,
      isSearchActive,
      inAXMode,
      forceLithoAXRender,
      outstandingSearchQuery,
      isAlignmentMode,
      accessibilitySettingsOpen,
      showLithoAccessibilitySettings,
    } = this.state;

    return (
      <FlexColumn grow={true}>
        <Toolbar>
          <SearchIconContainer
            onClick={this.onFindClick}
            role="button"
            tabIndex={-1}
            title="Select an element on the device to inspect it">
            <Glyph
              name="target"
              size={16}
              color={
                isSearchActive
                  ? colors.macOSTitleBarIconSelected
                  : colors.macOSTitleBarIconActive
              }
            />
          </SearchIconContainer>
          {this.axEnabled() ? (
            <SearchIconContainer
              onClick={this.onToggleAccessibility}
              role="button"
              tabIndex={-1}
              title="Toggle to see the accessibility hierarchy">
              <Glyph
                name="accessibility"
                size={16}
                color={
                  inAXMode
                    ? colors.macOSTitleBarIconSelected
                    : colors.macOSTitleBarIconActive
                }
              />
            </SearchIconContainer>
          ) : null}
          <SearchIconContainer
            onClick={this.onToggleAlignment}
            role="button"
            tabIndex={-1}
            title="Toggle AlignmentMode to show alignment lines">
            <Glyph
              name="borders"
              size={16}
              color={
                isAlignmentMode
                  ? colors.macOSTitleBarIconSelected
                  : colors.macOSTitleBarIconActive
              }
            />
          </SearchIconContainer>
          <SearchBox tabIndex={-1}>
            <SearchIcon
              name="magnifying-glass"
              color={colors.macOSTitleBarIcon}
              size={16}
            />
            <LayoutSearchInput onSubmit={this.search.bind(this)} />
            {outstandingSearchQuery && <LoadingSpinner size={16} />}
          </SearchBox>
          {inAXMode &&
            showLithoAccessibilitySettings && (
              <SearchIconContainer
                onClick={this.onOpenAccessibilitySettings}
                role="button">
                <Glyph
                  name="settings"
                  size={16}
                  color={
                    accessibilitySettingsOpen
                      ? colors.macOSTitleBarIconSelected
                      : colors.macOSTitleBarIconActive
                  }
                />
                {accessibilitySettingsOpen &&
                  this.getAccessibilitySettingsPopover(forceLithoAXRender)}
              </SearchIconContainer>
            )}
        </Toolbar>
        <FlexRow grow={true}>
          {initialised ? (
            <ElementsInspector
              onElementSelected={this.onElementSelected}
              onElementHovered={this.onElementHovered}
              onElementExpanded={this.onElementExpanded}
              onValueChanged={this.onDataValueChanged}
              selected={selected}
              searchResults={this.state.searchResults}
              root={root}
              elements={elements}
            />
          ) : (
            <Center grow={true}>
              <LoadingIndicator />
            </Center>
          )}
          {AXinitialised && inAXMode ? <VerticalRule /> : null}
          {AXinitialised && inAXMode ? (
            <ElementsInspector
              onElementSelected={this.onElementSelected}
              onElementHovered={this.onElementHovered}
              onElementExpanded={this.onElementExpanded}
              onValueChanged={this.onDataValueChanged}
              selected={AXselected}
              focused={AXfocused}
              root={AXroot}
              elements={AXelements}
              contextMenuExtensions={this.getAXContextMenuExtensions()}
            />
          ) : null}
        </FlexRow>
        <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
      </FlexColumn>
    );
  }
}
