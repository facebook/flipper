/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import {
  styled,
  PureComponent,
  FlexColumn,
  FlexRow,
  Text,
  Glyph,
  colors,
  brandColors,
} from 'sonar';
import {version} from '../../package.json';
import {shell} from 'electron';

const Container = FlexColumn.extends({
  height: '100%',
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundImage: 'url(./pattern.gif)',
});

const Welcome = FlexColumn.extends(
  {
    width: 460,
    background: colors.white,
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    opacity: props => (props.isMounted ? 1 : 0),
    transform: props => `translateY(${props.isMounted ? 0 : 20}px)`,
    transition: '0.6s all ease-out',
  },
  {
    ignoreAttributes: ['isMounted'],
  },
);

const Title = Text.extends({
  fontSize: 24,
  fontWeight: 300,
  textAlign: 'center',
  color: colors.light50,
  marginBottom: 16,
});

const Version = Text.extends({
  textAlign: 'center',
  fontSize: 11,
  fontWeight: 300,
  color: colors.light30,
  marginBottom: 60,
});

const Item = FlexRow.extends({
  padding: 10,
  cursor: 'pointer',
  alignItems: 'center',
  borderTop: `1px solid ${colors.light10}`,
  '&:hover, &:focus, &:active': {
    backgroundColor: colors.light02,
    textDecoration: 'none',
  },
});

const ItemTitle = Text.extends({
  color: colors.light50,
  fontSize: 15,
});

const ItemSubTitle = Text.extends({
  color: colors.light30,
  fontSize: 11,
  marginTop: 2,
});

const Icon = Glyph.extends({
  marginRight: 11,
  marginLeft: 6,
});

const Logo = styled.image({
  width: 128,
  height: 128,
  alignSelf: 'center',
  marginTop: 50,
  marginBottom: 20,
});

type Props = {};
type State = {
  isMounted: boolean,
};

export default class WelcomeScreen extends PureComponent<Props, State> {
  state = {
    isMounted: false,
  };

  componentDidMount() {
    setTimeout(
      () =>
        this.setState({
          isMounted: true,
        }),
      100,
    );
  }

  render() {
    return (
      <Container>
        <Welcome isMounted={this.state.isMounted}>
          <Logo src="./icon.png" />
          <Title>Welcome to Sonar</Title>
          <Version>Version {version}</Version>
          <Item
            onClick={() =>
              shell.openExternal(
                'https://our.intern.facebook.com/intern/dex/sonar/using-sonar/',
              )
            }>
            <Icon size={20} name="rocket" color={brandColors.Sonar} />
            <FlexColumn>
              <ItemTitle>Using Sonar</ItemTitle>
              <ItemSubTitle>
                Learn how Sonar can help you debugging your App
              </ItemSubTitle>
            </FlexColumn>
          </Item>
          <Item
            onClick={() =>
              shell.openExternal(
                'https://our.intern.facebook.com/intern/dex/sonar/development/',
              )
            }>
            <Icon size={20} name="magic-wand" color={brandColors.Sonar} />
            <FlexColumn>
              <ItemTitle>Create your own plugin</ItemTitle>
              <ItemSubTitle>Get started with these pointers</ItemSubTitle>
            </FlexColumn>
          </Item>
          <Item
            onClick={() =>
              shell.openExternal(
                'https://our.intern.facebook.com/intern/dex/sonar/adding-sonar-to-an-android-app/',
              )
            }>
            <Icon size={20} name="tools" color={brandColors.Sonar} />
            <FlexColumn>
              <ItemTitle>Add Sonar support to your app</ItemTitle>
              <ItemSubTitle>Get started with these pointers</ItemSubTitle>
            </FlexColumn>
          </Item>
          <Item
            onClick={() =>
              shell.openExternal(
                'https://fb.facebook.com/groups/230455004101832/',
              )
            }>
            <Icon size={20} name="posts" color={brandColors.Sonar} />
            <FlexColumn>
              <ItemTitle>Ideas and Feedback</ItemTitle>
              <ItemSubTitle>
                Join our group and help us improving Sonar
              </ItemSubTitle>
            </FlexColumn>
          </Item>
        </Welcome>
      </Container>
    );
  }
}
