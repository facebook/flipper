/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component, type Element} from 'react';
import {Glyph} from 'flipper';
import {getInstance as getLogger} from '../fb-stubs/Logger';
import GK from '../fb-stubs/GK';

type Props = {
  rating: ?number,
  onRatingChanged: number => void,
};

type State = {
  hoveredRating: ?number,
};

export default class RatingButton extends Component<Props, State> {
  state = {
    hoveredRating: null,
  };

  onRatingChanged(rating: number) {
    const previousRating = this.props.rating;
    if (rating === previousRating) {
      return;
    }
    this.props.onRatingChanged(rating);
    getLogger().track('usage', 'flipper-rating-changed', {
      rating,
      previousRating,
    });
  }

  render() {
    if (!GK.get('flipper_rating')) {
      return null;
    }
    const rating = this.props.rating || 0;
    if (rating < 0 || rating > 5) {
      throw new Error(`Rating must be between 0 and 5. Value: ${rating}`);
    }
    const stars = Array(5)
      .fill(true)
      .map<Element<*>>((_, index) => (
        <div
          role="button"
          tabIndex={0}
          onMouseEnter={() => {
            this.setState({hoveredRating: index + 1});
          }}
          onMouseLeave={() => {
            this.setState({hoveredRating: null});
          }}
          onClick={() => {
            this.onRatingChanged(index + 1);
          }}>
          <Glyph
            name="star"
            color="grey"
            variant={
              (this.state.hoveredRating
              ? index < this.state.hoveredRating
              : index < rating)
                ? 'filled'
                : 'outline'
            }
          />
        </div>
      ));
    return stars;
  }
}
