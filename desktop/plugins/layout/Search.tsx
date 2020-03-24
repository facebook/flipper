/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PersistedState, ElementMap} from './';
import {
  PluginClient,
  ElementSearchResultSet,
  Element,
  SearchInput,
  SearchBox,
  SearchIcon,
  LoadingIndicator,
  styled,
  colors,
} from 'flipper';
import {Component} from 'react';
import React from 'react';

export type SearchResultTree = {
  id: string;
  isMatch: boolean;
  hasChildren: boolean;
  children: Array<SearchResultTree>;
  element: Element;
  axElement: Element | null; // Not supported in iOS
};

type Props = {
  client: PluginClient;
  inAXMode: boolean;
  onSearchResults: (searchResults: ElementSearchResultSet) => void;
  setPersistedState: (state: Partial<PersistedState>) => void;
  persistedState: PersistedState;
  initialQuery: string | null;
};

type State = {
  value: string;
  outstandingSearchQuery: string | null;
};

const LoadingSpinner = styled(LoadingIndicator)({
  marginRight: 4,
  marginLeft: 3,
  marginTop: -1,
});

export default class Search extends Component<Props, State> {
  state = {
    value: '',
    outstandingSearchQuery: null,
  };

  timer: NodeJS.Timeout | undefined;

  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    const {value} = e.target;
    this.setState({value});
    this.timer = setTimeout(() => this.performSearch(value), 200);
  };

  onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      this.performSearch(this.state.value);
    }
  };

  componentDidMount() {
    if (this.props.initialQuery) {
      const queryString = this.props.initialQuery
        ? this.props.initialQuery
        : '';
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = setTimeout(() => this.performSearch(queryString), 200);
    }
  }

  performSearch(query: string) {
    this.setState({
      outstandingSearchQuery: query,
    });

    if (!query) {
      this.displaySearchResults(
        {query: '', results: null},
        this.props.inAXMode,
      );
    } else {
      this.props.client
        .call('getSearchResults', {query, axEnabled: this.props.inAXMode})
        .then((response) =>
          this.displaySearchResults(response, this.props.inAXMode),
        );
    }
  }

  displaySearchResults(
    {
      results,
      query,
    }: {
      results: SearchResultTree | null;
      query: string;
    },
    axMode: boolean,
  ) {
    this.setState({
      outstandingSearchQuery:
        query === this.state.outstandingSearchQuery
          ? null
          : this.state.outstandingSearchQuery,
    });

    const searchResults = this.getElementsFromSearchResultTree(results);
    const searchResultIDs = new Set(searchResults.map((r) => r.element.id));
    const elements: ElementMap = searchResults.reduce(
      (acc: ElementMap, {element}: SearchResultTree) => ({
        ...acc,
        [element.id]: {
          ...element,
          // expand all search results, that we have have children for
          expanded: element.children.some((c) => searchResultIDs.has(c)),
        },
      }),
      this.props.persistedState.elements,
    );

    let {AXelements} = this.props.persistedState;
    if (axMode) {
      AXelements = searchResults.reduce(
        (acc: ElementMap, {axElement}: SearchResultTree) => {
          if (!axElement) {
            return acc;
          }
          return {
            ...acc,
            [axElement.id]: {
              ...axElement,
              // expand all search results, that we have have children for
              expanded: axElement.children.some((c) => searchResultIDs.has(c)),
            },
          };
        },
        this.props.persistedState.AXelements,
      );
    }

    this.props.setPersistedState({elements, AXelements});

    this.props.onSearchResults({
      matches: new Set(
        searchResults.filter((x) => x.isMatch).map((x) => x.element.id),
      ),
      query: query,
    });
  }

  getElementsFromSearchResultTree(
    tree: SearchResultTree | null,
  ): Array<SearchResultTree> {
    if (!tree) {
      return [];
    }
    let elements = [
      {
        children: [] as Array<SearchResultTree>,
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

  render() {
    return (
      <SearchBox tabIndex={-1}>
        <SearchIcon
          name="magnifying-glass"
          color={colors.macOSTitleBarIcon}
          size={16}
        />
        <SearchInput
          placeholder={'Search'}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
          value={this.state.value}
        />
        {this.state.outstandingSearchQuery && <LoadingSpinner size={16} />}
      </SearchBox>
    );
  }
}
