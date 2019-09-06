/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React, {Component, ReactElement} from 'react';
import {Glyph, Popover, FlexColumn, FlexRow, Button, Checkbox} from 'flipper';
import GK from '../fb-stubs/GK';
import * as UserFeedback from '../fb-stubs/UserFeedback';

type Props = {
  onRatingChanged: (rating: number) => void;
};

type State = {
  isShown: boolean;
};

type NextAction = 'select-rating' | 'leave-comment' | 'finished';

class FeedbackComponent extends Component<
  {
    submitRating: (rating: number) => void;
    submitComment: (
      rating: number,
      comment: string,
      selectedPredefinedComments: Array<string>,
      allowUserInfoSharing: boolean,
    ) => void;
    close(): void;
  },
  {
    rating: number | null;
    hoveredRating: number;
    allowUserInfoSharing: boolean;
    nextAction: NextAction;
    predefinedComments: {[key: string]: boolean};
  }
> {
  state = {
    rating: null,
    hoveredRating: 0,
    allowUserInfoSharing: true,
    nextAction: 'select-rating' as NextAction,
    predefinedComments: {'Too slow': false, Rubbish: false},
  };
  onSubmitRating(newRating: number) {
    const nextAction = newRating <= 2 ? 'leave-comment' : 'finished';
    this.setState({rating: newRating, nextAction: nextAction});
    this.props.submitRating(newRating);
    if (nextAction === 'finished') {
      setTimeout(this.props.close, 1000);
    }
  }
  onCommentSubmitted(comment: string) {
    this.setState({nextAction: 'finished'});
    const selectedPredefinedComments: Array<string> = Object.entries(
      this.state.predefinedComments,
    )
      .map(x => ({comment: x[0], enabled: x[1]}))
      .filter(x => x.enabled)
      .map(x => x.comment);
    const currentRating = this.state.rating;
    if (currentRating) {
      this.props.submitComment(
        currentRating,
        comment,
        selectedPredefinedComments,
        this.state.allowUserInfoSharing,
      );
    } else {
      console.error('Illegal state: Submitting comment with no rating set.');
    }
    setTimeout(this.props.close, 1000);
  }
  onAllowUserSharingChanged(allowed: boolean) {
    this.setState({allowUserInfoSharing: allowed});
  }
  render() {
    const stars = Array(5)
      .fill(true)
      .map<JSX.Element>((_, index) => (
        <div
          key={index}
          role="button"
          tabIndex={0}
          onMouseEnter={() => {
            this.setState({hoveredRating: index + 1});
          }}
          onMouseLeave={() => {
            this.setState({hoveredRating: 0});
          }}
          onClick={() => {
            this.onSubmitRating(index + 1);
          }}>
          <Glyph
            name="star"
            color="grey"
            variant={
              (this.state.hoveredRating
              ? index < this.state.hoveredRating
              : index < (this.state.rating || 0))
                ? 'filled'
                : 'outline'
            }
          />
        </div>
      ));
    let body: Array<ReactElement>;
    switch (this.state.nextAction) {
      case 'select-rating':
        body = [
          <FlexRow>
            How would you rate your overall satisfaction with Flipper?
          </FlexRow>,
          <FlexRow>{stars}</FlexRow>,
        ];
        break;
      case 'leave-comment':
        body = [
          <FlexRow>Predefined comment buttons here...</FlexRow>,
          <FlexRow>Comment input box here...</FlexRow>,
          <FlexRow>
            <Checkbox
              checked={this.state.allowUserInfoSharing}
              onChange={this.onAllowUserSharingChanged.bind(this)}
            />
            Can contact me.{' '}
            <Button onClick={() => this.onCommentSubmitted('some comment')}>
              Submit
            </Button>
          </FlexRow>,
        ];
        break;
      case 'finished':
        body = [];
        break;
      default: {
        console.error('Illegal state: nextAction: ' + this.state.nextAction);
        return null;
      }
    }
    return (
      <FlexColumn>
        <FlexRow>
          {this.state.nextAction === 'finished'
            ? 'Feedback Received'
            : "We'd love your feedback"}
        </FlexRow>
        {body}
      </FlexColumn>
    );
  }
}

export default class RatingButton extends Component<Props, State> {
  state = {
    isShown: false,
  };

  onClick() {
    this.setState({isShown: !this.state.isShown});
  }

  submitRating(rating: number) {
    UserFeedback.submitRating(rating);
  }

  submitComment(
    rating: number,
    comment: string,
    selectedPredefinedComments: Array<string>,
    allowUserInfoSharing: boolean,
  ) {
    UserFeedback.submitComment(
      rating,
      comment,
      selectedPredefinedComments,
      allowUserInfoSharing,
    );
  }

  render() {
    if (!GK.get('flipper_rating')) {
      return null;
    }
    const stars = (
      <div onClick={this.onClick.bind(this)}>
        <Glyph
          name="star"
          color="grey"
          variant={this.state.isShown ? 'filled' : 'outline'}
        />
      </div>
    );
    return [
      stars,
      this.state.isShown ? (
        <Popover
          onDismiss={() => {}}
          children={
            <FeedbackComponent
              submitRating={this.submitRating.bind(this)}
              submitComment={this.submitComment.bind(this)}
              close={() => {
                this.setState({isShown: false});
              }}
            />
          }
        />
      ) : null,
    ];
  }
}
