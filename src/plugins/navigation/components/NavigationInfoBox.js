/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {styled} from 'flipper';
import {parseURIParameters} from '../util/uri';
import {IconButton} from './';

type Props = {|
  uri: ?string,
  onNavigate: (query: string) => void,
  onFavorite: (query: string) => void,
|};

const NavigationInfoBoxContainer = styled('div')({
  backgroundColor: '#FDFDEA',
  maxWidth: 500,
  height: 'fit-content',
  padding: 20,
  borderRadius: 10,
  margin: 20,
  width: 'fit-content',
  position: 'relative',
  '.nav-info-text': {
    color: '#707070',
    fontSize: '1.2em',
    lineHeight: '1.25em',
  },
  '.nav-info-text.bold': {
    fontWeight: 'bold',
    marginTop: '10px',
  },
  '.nav-info-text.selectable': {
    userSelect: 'text',
    cursor: 'text',
  },
  '.icon-container': {
    display: 'inline-flex',
    padding: 5,
    position: 'absolute',
    top: 0,
    right: 0,
    '>*': {
      marginRight: 2,
    },
  },
});

export default (props: Props) => {
  const {uri} = props;
  if (uri == null) {
    return (
      <NavigationInfoBoxContainer>
        <div className="nav-info-text">View has no URI information</div>
      </NavigationInfoBoxContainer>
    );
  } else {
    const parameters = parseURIParameters(uri);
    return (
      <NavigationInfoBoxContainer>
        <div className="icon-container">
          <IconButton icon="star" outline={true} size={16} />
          <IconButton icon="eye" size={16} />
        </div>
        <div className="nav-info-text bold">uri:</div>
        <div className="nav-info-text selectable">{uri}</div>
        {parameters.size > 0 ? (
          <>
            <div className="nav-info-text bold">parameters:</div>
            {Array.from(parameters, ([key, value]) => (
              <div key={key} className="nav-info-text selectable">
                {key}
                {value ? `: ${value}` : ''}
              </div>
            ))}
          </>
        ) : null}
      </NavigationInfoBoxContainer>
    );
  }
};
