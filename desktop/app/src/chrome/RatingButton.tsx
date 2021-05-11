/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {
  Component,
  ReactElement,
  RefObject,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Glyph,
  FlexColumn,
  FlexRow,
  Button,
  Checkbox,
  styled,
  Input,
  Link,
} from '../ui';
import LegacyPopover from '../ui/components/Popover2';
import {LeftRailButton} from '../sandy-chrome/LeftRail';
import GK from '../fb-stubs/GK';
import * as UserFeedback from '../fb-stubs/UserFeedback';
import {FeedbackPrompt} from '../fb-stubs/UserFeedback';
import {StarOutlined} from '@ant-design/icons';
import {Popover, Rate} from 'antd';
import {useStore} from '../utils/useStore';
import {isLoggedIn} from '../fb-stubs/user';
import {useValue} from 'flipper-plugin';

type PropsFromState = {
  sessionId: string | null;
};

type State = {
  promptData: FeedbackPrompt | null;
  isShown: boolean;
  hasTriggered: boolean;
};

type NextAction = 'select-rating' | 'leave-comment' | 'finished';

class PredefinedComment extends Component<{
  comment: string;
  selected: boolean;
  onClick: (_: unknown) => unknown;
}> {
  static Container = styled.div<{selected: boolean}>((props) => {
    return {
      border: '1px solid #f2f3f5',
      cursor: 'pointer',
      borderRadius: 24,
      backgroundColor: props.selected ? '#ecf3ff' : '#f2f3f5',
      marginBottom: 4,
      marginRight: 4,
      padding: '4px 8px',
      color: props.selected ? 'rgb(56, 88, 152)' : undefined,
      borderColor: props.selected ? '#3578e5' : undefined,
      ':hover': {
        borderColor: '#3578e5',
      },
    };
  });
  render() {
    return (
      <PredefinedComment.Container
        onClick={this.props.onClick}
        selected={this.props.selected}>
        {this.props.comment}
      </PredefinedComment.Container>
    );
  }
}

const Row = styled(FlexRow)({
  marginTop: 5,
  marginBottom: 5,
  justifyContent: 'center',
  textAlign: 'center',
  color: '#9a9a9a',
  flexWrap: 'wrap',
});

const DismissRow = styled(Row)({
  marginBottom: 0,
  marginTop: 10,
});

const DismissButton = styled.span({
  '&:hover': {
    textDecoration: 'underline',
    cursor: 'pointer',
  },
});

const Spacer = styled(FlexColumn)({
  flexGrow: 1,
});

function dismissRow(dismiss: () => void) {
  return (
    <DismissRow key="dismiss">
      <Spacer />
      <DismissButton onClick={dismiss}>Dismiss</DismissButton>
      <Spacer />
    </DismissRow>
  );
}

type FeedbackComponentState = {
  rating: number | null;
  hoveredRating: number;
  allowUserInfoSharing: boolean;
  nextAction: NextAction;
  predefinedComments: {[key: string]: boolean};
  comment: string;
};

class FeedbackComponent extends Component<
  {
    submitRating: (rating: number) => void;
    submitComment: (
      rating: number,
      comment: string,
      selectedPredefinedComments: Array<string>,
      allowUserInfoSharing: boolean,
    ) => void;
    close: () => void;
    dismiss: () => void;
    promptData: FeedbackPrompt;
  },
  FeedbackComponentState
> {
  state: FeedbackComponentState = {
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
      setTimeout(this.props.close, 5000);
    }
  }
  onCommentSubmitted(comment: string) {
    this.setState({nextAction: 'finished'});
    const selectedPredefinedComments: Array<string> = Object.entries(
      this.state.predefinedComments,
    )
      .map((x) => ({comment: x[0], enabled: x[1]}))
      .filter((x) => x.enabled)
      .map((x) => x.comment);
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
    let body: Array<ReactElement>;
    switch (this.state.nextAction) {
      case 'select-rating':
        body = [
          <Row key="bodyText">{this.props.promptData.bodyText}</Row>,
          <Row key="stars" style={{margin: 'auto'}}>
            <Rate onChange={(newRating) => this.onSubmitRating(newRating)} />
          </Row>,
          dismissRow(this.props.dismiss),
        ];
        break;
      case 'leave-comment':
        const predefinedComments = Object.entries(
          this.state.predefinedComments,
        ).map((c: [string, unknown], idx: number) => (
          <PredefinedComment
            key={idx}
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
          <Row key="predefinedComments">{predefinedComments}</Row>,
          <Row key="inputRow">
            <Input
              style={{height: 30, width: '100%'}}
              placeholder={this.props.promptData.commentPlaceholder}
              value={this.state.comment}
              onChange={(e) => this.setState({comment: e.target.value})}
              onKeyDown={(e) =>
                e.key == 'Enter' && this.onCommentSubmitted(this.state.comment)
              }
              autoFocus={true}
            />
          </Row>,
          <Row key="contactCheckbox">
            <Checkbox
              checked={this.state.allowUserInfoSharing}
              onChange={this.onAllowUserSharingChanged.bind(this)}
            />
            {'Tool owner can contact me '}
          </Row>,
          <Row key="submit">
            <Button onClick={() => this.onCommentSubmitted(this.state.comment)}>
              Submit
            </Button>
          </Row>,
          dismissRow(this.props.dismiss),
        ];
        break;
      case 'finished':
        body = [
          <Row key="thanks">
            Thanks for the feedback! You can now help
            <Link href="https://www.internalfb.com/intern/papercuts/?application=flipper">
              prioritize bugs and features for Flipper in Papercuts
            </Link>
          </Row>,
          dismissRow(this.props.dismiss),
        ];
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
        <Row key="heading" style={{color: 'black', fontSize: 20}}>
          {this.state.nextAction === 'finished'
            ? this.props.promptData.postSubmitHeading
            : this.props.promptData.preSubmitHeading}
        </Row>
        {body}
      </FlexColumn>
    );
  }
}

class RatingButton extends Component<PropsFromState, State> {
  state: State = {
    promptData: null,
    isShown: false,
    hasTriggered: false,
  };

  glyphRef: RefObject<HTMLDivElement> = React.createRef();

  constructor(props: PropsFromState) {
    super(props);
    if (GK.get('flipper_enable_star_ratiings')) {
      UserFeedback.getPrompt().then((prompt) => {
        this.setState({promptData: prompt});
        setTimeout(this.triggerPopover.bind(this), 30000);
      });
    }
  }

  onClick() {
    const willBeShown = !this.state.isShown;
    this.setState({isShown: willBeShown, hasTriggered: true});
    if (!willBeShown) {
      UserFeedback.dismiss(this.props.sessionId);
    }
  }

  submitRating(rating: number) {
    UserFeedback.submitRating(rating, this.props.sessionId);
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
      this.props.sessionId,
    );
  }

  triggerPopover() {
    if (!this.state.hasTriggered) {
      this.setState({isShown: true, hasTriggered: true});
    }
  }

  render() {
    const promptData = this.state.promptData;
    if (!promptData) {
      return null;
    }
    if (
      !promptData.shouldPopup ||
      (this.state.hasTriggered && !this.state.isShown)
    ) {
      return null;
    }
    return (
      <div style={{position: 'relative'}}>
        <div
          role="button"
          tabIndex={0}
          onClick={this.onClick.bind(this)}
          ref={this.glyphRef}>
          <Glyph
            name="star"
            color="grey"
            variant={this.state.isShown ? 'filled' : 'outline'}
          />
        </div>
        {this.state.isShown ? (
          <LegacyPopover id="rating-button" targetRef={this.glyphRef}>
            <FeedbackComponent
              submitRating={this.submitRating.bind(this)}
              submitComment={this.submitComment.bind(this)}
              close={() => {
                this.setState({isShown: false});
              }}
              dismiss={this.onClick.bind(this)}
              promptData={promptData}
            />
          </LegacyPopover>
        ) : null}
      </div>
    );
  }
}

export function SandyRatingButton() {
  const [promptData, setPromptData] =
    useState<UserFeedback.FeedbackPrompt | null>(null);
  const [isShown, setIsShown] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const sessionId = useStore((store) => store.application.sessionId);
  const loggedIn = useValue(isLoggedIn());

  const triggerPopover = useCallback(() => {
    if (!hasTriggered) {
      setIsShown(true);
      setHasTriggered(true);
    }
  }, [hasTriggered]);

  useEffect(() => {
    if (GK.get('flipper_enable_star_ratiings') && !hasTriggered && loggedIn) {
      UserFeedback.getPrompt().then((prompt) => {
        setPromptData(prompt);
        setTimeout(triggerPopover, 30000);
      });
    }
  }, [triggerPopover, hasTriggered, loggedIn]);

  const onClick = () => {
    const willBeShown = !isShown;
    setIsShown(willBeShown);
    setHasTriggered(true);
    if (!willBeShown) {
      UserFeedback.dismiss(sessionId);
    }
  };

  const submitRating = (rating: number) => {
    UserFeedback.submitRating(rating, sessionId);
  };

  const submitComment = (
    rating: number,
    comment: string,
    selectedPredefinedComments: Array<string>,
    allowUserInfoSharing: boolean,
  ) => {
    UserFeedback.submitComment(
      rating,
      comment,
      selectedPredefinedComments,
      allowUserInfoSharing,
      sessionId,
    );
  };

  if (!promptData) {
    return null;
  }
  if (!promptData.shouldPopup || (hasTriggered && !isShown)) {
    return null;
  }
  return (
    <Popover
      visible={isShown}
      content={
        <FeedbackComponent
          submitRating={submitRating}
          submitComment={submitComment}
          close={() => {
            setIsShown(false);
          }}
          dismiss={onClick}
          promptData={promptData}
        />
      }
      placement="right"
      trigger="click">
      <LeftRailButton
        icon={<StarOutlined />}
        title="Rate Flipper"
        onClick={onClick}
        small
      />
    </Popover>
  );
}
