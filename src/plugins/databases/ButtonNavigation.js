import {
    Button,
    ButtonGroup,
    Glyph,
    colors
  } from 'flipper';

export default function ButtonNavigation(props: {|
    /** Back button is enabled */
    canGoBack: boolean,
    /** Forwards button is enabled */
    canGoForward: boolean,
    /** Callback when back button is clicked */
    onBack: () => void,
    /** Callback when forwards button is clicked */
    onForward: () => void
  |}) {
    return (
      <ButtonGroup>
        <Button disabled={!props.canGoBack} onClick={props.onBack}>
            <Glyph
                name="chevron-left"
                size={16}
                color={
                props.active
                    ? colors.macOSTitleBarIconSelected
                    : colors.macOSTitleBarIconActive
                }
            />
        </Button>
        <Button disabled={!props.canGoForward} onClick={props.onForward}>
        <Glyph
                name="chevron-right"
                size={16}
                color={
                props.active
                    ? colors.macOSTitleBarIconSelected
                    : colors.macOSTitleBarIconActive
                }
            />
        </Button>
      </ButtonGroup>
    );
  }