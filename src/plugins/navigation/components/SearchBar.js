/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {
  Component,
  styled,
  SearchBox,
  SearchInput,
  Toolbar,
  Glyph,
} from 'flipper';
import {AutoCompleteSheet, IconButton, FavoriteButton} from './';

import type {Bookmark} from '../flow-types';

type Props = {|
  onFavorite: (query: string) => void,
  onNavigate: (query: string) => void,
  bookmarks: Map<string, Bookmark>,
|};

type State = {|
  query: string,
  inputFocused: boolean,
  autoCompleteSheetOpen: boolean,
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
  };

  favorite = (query: string) => {
    this.props.onFavorite(query);
  };

  navigateTo = (query: string) => {
    this.setState({query});
    this.props.onNavigate(query);
  };

  queryInputChanged = (event: SyntheticInputEvent<>) => {
    this.setState({query: event.target.value});
  };

  render = () => {
    const {bookmarks} = this.props;
    const {autoCompleteSheetOpen, inputFocused, query} = this.state;
    return (
      <ToolbarContainer>
        <Toolbar>
          <SearchBox className={inputFocused ? 'drop-shadow' : null}>
            <SearchInputContainer>
              <SearchInput
                value={query}
                onBlur={() =>
                  this.setState({
                    autoCompleteSheetOpen: false,
                    inputFocused: false,
                  })
                }
                onFocus={() =>
                  this.setState({
                    autoCompleteSheetOpen: true,
                    inputFocused: true,
                  })
                }
                onChange={this.queryInputChanged}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    this.navigateTo(this.state.query);
                    e.target.blur();
                  }
                }}
                placeholder="Navigate To..."
              />
              {autoCompleteSheetOpen ? (
                <AutoCompleteSheet
                  bookmarks={bookmarks}
                  onNavigate={this.navigateTo}
                  onHighlighted={newQuery => this.setState({query: newQuery})}
                />
              ) : null}
            </SearchInputContainer>
          </SearchBox>
          {query.length > 0 ? (
            <IconContainer>
              <IconButton
                icon="send"
                size={16}
                outline={true}
                onClick={() => this.navigateTo(this.state.query)}
              />
              <FavoriteButton
                size={16}
                highlighted={bookmarks.has(query)}
                onClick={() => this.favorite(this.state.query)}
              />
            </IconContainer>
          ) : null}
        </Toolbar>
      </ToolbarContainer>
    );
  };
}

export default SearchBar;
