/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {Component, styled, SearchBox, SearchInput, Toolbar} from 'flipper';
import {AutoCompleteSheet, IconButton, FavoriteButton} from './';

import type {AutoCompleteProvider, Bookmark} from '../flow-types';

type Props = {|
  onFavorite: (query: string) => void,
  onNavigate: (query: string) => void,
  bookmarks: Map<string, Bookmark>,
  providers: Array<AutoCompleteProvider>,
  uriFromAbove: string,
|};

type State = {|
  query: string,
  inputFocused: boolean,
  autoCompleteSheetOpen: boolean,
  searchInputValue: string,
  prevURIFromAbove: string,
|};

const IconContainer = styled('div')({
  display: 'inline-flex',
  height: '16px',
  alignItems: 'center',
  '': {
    marginLeft: 10,
    '.icon-button': {
      height: 16,
    },
    'img,div': {
      verticalAlign: 'top',
      alignItems: 'none',
    },
  },
});

const ToolbarContainer = styled('div')({
  '.drop-shadow': {
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  },
});

const SearchInputContainer = styled('div')({
  height: '100%',
  width: '100%',
  marginLeft: 5,
  marginRight: 9,
  position: 'relative',
});

class SearchBar extends Component<Props, State> {
  state = {
    inputFocused: false,
    autoCompleteSheetOpen: false,
    query: '',
    searchInputValue: '',
    prevURIFromAbove: '',
  };

  favorite = (searchInputValue: string) => {
    this.props.onFavorite(searchInputValue);
  };

  navigateTo = (searchInputValue: string) => {
    this.setState({query: searchInputValue, searchInputValue});
    this.props.onNavigate(searchInputValue);
  };

  queryInputChanged = (event: SyntheticInputEvent<>) => {
    const value = event.target.value;
    this.setState({query: value, searchInputValue: value});
  };

  static getDerivedStateFromProps = (newProps: Props, state: State) => {
    const {uriFromAbove: newURIFromAbove} = newProps;
    const {prevURIFromAbove} = state;
    if (newURIFromAbove !== prevURIFromAbove) {
      return {
        searchInputValue: newURIFromAbove,
        query: newURIFromAbove,
        prevURIFromAbove: newURIFromAbove,
      };
    }
    return null;
  };

  render = () => {
    const {bookmarks, providers} = this.props;
    const {
      autoCompleteSheetOpen,
      inputFocused,
      searchInputValue,
      query,
    } = this.state;
    return (
      <ToolbarContainer>
        <Toolbar>
          <SearchBox className={inputFocused ? 'drop-shadow' : null}>
            <SearchInputContainer>
              <SearchInput
                value={searchInputValue}
                onBlur={() =>
                  this.setState({
                    autoCompleteSheetOpen: false,
                    inputFocused: false,
                  })
                }
                onFocus={event => {
                  event.target.select();
                  this.setState({
                    autoCompleteSheetOpen: true,
                    inputFocused: true,
                  });
                }}
                onChange={this.queryInputChanged}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    this.navigateTo(this.state.searchInputValue);
                    e.target.blur();
                  }
                }}
                placeholder="Navigate To..."
              />
              {autoCompleteSheetOpen && query.length > 0 ? (
                <AutoCompleteSheet
                  providers={providers}
                  onNavigate={this.navigateTo}
                  onHighlighted={newInputValue =>
                    this.setState({searchInputValue: newInputValue})
                  }
                  query={query}
                />
              ) : null}
            </SearchInputContainer>
          </SearchBox>
          {searchInputValue.length > 0 ? (
            <IconContainer>
              <IconButton
                icon="send"
                size={16}
                outline={true}
                onClick={() => this.navigateTo(searchInputValue)}
              />
              <FavoriteButton
                size={16}
                highlighted={bookmarks.has(searchInputValue)}
                onClick={() => this.favorite(searchInputValue)}
              />
            </IconContainer>
          ) : null}
        </Toolbar>
      </ToolbarContainer>
    );
  };
}

export default SearchBar;
