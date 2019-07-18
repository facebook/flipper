/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {styled} from 'flipper';
import {parseURIParameters} from '../util/uri';

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
