/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React, {Component, ReactElement} from 'react';
import {
  Glyph,
  Popover,
  FlexColumn,
  FlexRow,
  Button,
  Checkbox,
  styled,
  Input,
} from 'flipper';
import GK from '../fb-stubs/GK';
import * as UserFeedback from '../fb-stubs/UserFeedback';
import {FeedbackPrompt} from '../fb-stubs/UserFeedback';

type Props = {
  onRatingChanged: (rating: number) => void;
};

type State = {
  promptData: FeedbackPrompt | null;
  isShown: boolean;
};

type NextAction = 'select-rating' | 'leave-comment' | 'finished';

class PredefinedComment extends Component<{
  comment: string;
  selected: boolean;
  onClick: (_: unknown) => unknown;
}> {
  render() {
    return (
      <div onClick={this.props.onClick}>
        {this.props.comment + (this.props.selected ? ' - Y' : ' - N')}
      </div>
    );
  }
}

const Row = styled(FlexRow)({
  marginTop: 5,
  marginBottom: 5,
  justifyContent: 'center',
  textAlign: 'center',
  color: '#9a9a9a',
});

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
    promptData: FeedbackPrompt;
  },
  {
    rating: number | null;
    hoveredRating: number;
    allowUserInfoSharing: boolean;
    nextAction: NextAction;
    predefinedComments: {[key: string]: boolean};
    comment: string;
  }
> {
  state = {
    rating: null,
    hoveredRating: 0,
    allowUserInfoSharing: true,
    nextAction: 'select-rating' as NextAction,
    predefinedComments: this.props.promptData.predefinedComments.reduce(
      (acc, cv) => ({...acc, [cv]: false}),
      {},
    ),
    comment: '',
  };
  onSubmitRating(newRating: number) {
    const nextAction = newRating <= 2 ? 'leave-comment' : 'finished';
    this.setState({rating: newRating, nextAction: nextAction});
    this.props.submitRating(newRating);
    if (nextAction === 'finished') {
      setTimeout(this.props.close, 1500);
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
            name={
              (this.state.hoveredRating
              ? index < this.state.hoveredRating
              : index < (this.state.rating || 0))
                ? 'star'
                : 'star-outline'
            }
            color="grey"
            size={24}
          />
        </div>
      ));
    let body: Array<ReactElement>;
    switch (this.state.nextAction) {
      case 'select-rating':
        body = [
          <Row>{this.props.promptData.bodyText}</Row>,
          <Row style={{margin: 'auto'}}>{stars}</Row>,
        ];
        break;
      case 'leave-comment':
        const predefinedComments = Object.entries(
          this.state.predefinedComments,
        ).map((c: [string, unknown]) => (
          <PredefinedComment
            comment={c[0]}
            selected={Boolean(c[1])}
            onClick={() =>
              this.setState({
                predefinedComments: {
                  ...this.state.predefinedComments,
                  [c[0]]: !c[1],
                },
              })
            }
          />
        ));
        body = [
          <Row>{predefinedComments}</Row>,
          <Row>
            <Input
              style={{height: 30, width: '100%'}}
              placeholder={this.props.promptData.commentPlaceholder}
              value={this.state.comment}
              onChange={e => this.setState({comment: e.target.value})}
            />
          </Row>,
          <Row>
            <Checkbox
              checked={this.state.allowUserInfoSharing}
              onChange={this.onAllowUserSharingChanged.bind(this)}
            />
            {'Tool owner can contact me '}
          </Row>,
          <Row>
            <Button onClick={() => this.onCommentSubmitted(this.state.comment)}>
              Submit
            </Button>
          </Row>,
        ];
        break;
      case 'finished':
        body = [<Row>Thanks!</Row>];
        break;
      default: {
        console.error('Illegal state: nextAction: ' + this.state.nextAction);
        return null;
      }
    }
    return (
      <FlexColumn
        style={{
          width: 400,
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 10,
          paddingBottom: 10,
        }}>
        <Row style={{color: 'black', fontSize: 20}}>
          {this.state.nextAction === 'finished'
            ? this.props.promptData.postSubmitHeading
            : this.props.promptData.preSubmitHeading}
        </Row>
        {body}
      </FlexColumn>
    );
  }
}

export default class RatingButton extends Component<Props, State> {
  state = {
    promptData: null,
    isShown: false,
  };

  constructor(props: Props) {
    super(props);
    UserFeedback.getPrompt().then(prompt =>
      this.setState({promptData: prompt}),
    );
  }

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
    const promptData = this.state.promptData;
    if (!promptData) {
      return null;
    }
    return (
      <div style={{position: 'relative'}}>
        <div onClick={this.onClick.bind(this)}>
          <Glyph
            name="star"
            color="grey"
            variant={this.state.isShown ? 'filled' : 'outline'}
          />
        </div>
        {this.state.isShown ? (
          <Popover
            onDismiss={() => {}}
            children={
              <FeedbackComponent
                submitRating={this.submitRating.bind(this)}
                submitComment={this.submitComment.bind(this)}
                close={() => {
                  this.setState({isShown: false});
                }}
                promptData={promptData}
              />
            }
          />
        ) : null}
      </div>
    );
  }
}
