/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type alignContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'stretch';
export type alignItems =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'baseline'
  | 'stretch';
export type alignSelf =
  | 'auto'
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'baseline'
  | 'stretch';
export type all = 'initial' | 'inherit' | 'unset';
export type animation = singleAnimation;
export type animationDelay = number;
export type animationDirection = singleAnimationDirection;
export type animationDuration = string | number;
export type animationFillMode = singleAnimationFillMode;
export type animationIterationCount = singleAnimationIterationCount;
export type animationName = singleAnimationName;
export type animationPlayState = singleAnimationPlayState;
export type animationTimingFunction = singleTimingFunction;
export type appearance = 'auto' | 'none';
export type azimuth = number | string | 'leftwards' | 'rightwards';
export type backdropFilter = 'none' | string;
export type backfaceVisibility = 'visible' | 'hidden';
type backgroundSyntax = {|
  attachment?: attachment,
  color?: color,
  image?: bgImage,
  position?: string,
  repeat?: repeatStyle,
|};
export type background = string | finalBgLayer | backgroundSyntax;
export type backgroundAttachment = attachment;
export type backgroundBlendMode = blendMode;
export type backgroundClip = box;
export type backgroundColor = color;
export type backgroundImage = bgImage;
export type backgroundOrigin = box;
export type backgroundPosition = string;
export type backgroundPositionX = string;
export type backgroundPositionY = string;
export type backgroundRepeat = repeatStyle;
export type backgroundSize = bgSize;
export type blockSize = width;
type borderSyntax = {|
  width?: borderWidth,
  style?: brStyle,
  color?: color,
|};
export type border = borderWidth | brStyle | color | borderSyntax;
export type borderBlockEnd = borderWidth | borderStyle | color;
export type borderBlockEndColor = color;
export type borderBlockEndStyle = borderStyle;
export type borderBlockEndWidth = borderWidth;
export type borderBlockStart = borderWidth | borderStyle | color;
export type borderBlockStartColor = color;
export type borderBlockStartStyle = borderStyle;
export type borderBlockStartWidth = borderWidth;
export type borderBottomLeftRadius = lengthPercentage;
export type borderBottomRightRadius = lengthPercentage;
export type borderBottomStyle = brStyle;
export type borderBottomWidth = borderWidth;
export type borderCollapse = 'collapse' | 'separate';
export type borderColor = color;
export type borderImage =
  | borderImageSource
  | borderImageSlice
  | string
  | borderImageRepeat;
export type borderImageOutset = string;
export type borderImageRepeat = string;
export type borderImageSlice = string | number | 'fill';
export type borderImageSource = 'none' | string;
export type borderImageWidth = string;
export type borderInlineEnd = borderWidth | borderStyle | color;
export type borderInlineEndColor = color;
export type borderInlineEndStyle = borderStyle;
export type borderInlineEndWidth = borderWidth;
export type borderInlineStart = borderWidth | borderStyle | color;
export type borderInlineStartColor = color;
export type borderInlineStartStyle = borderStyle;
export type borderInlineStartWidth = borderWidth;
export type borderLeftColor = color;
export type borderLeftStyle = brStyle;
export type borderLeftWidth = borderWidth;
export type borderRightColor = color;
export type borderRightStyle = brStyle;
export type borderRightWidth = borderWidth;
export type borderRadius = lengthPercentage;
export type borderSpacing = number;
export type borderStyle = brStyle;
export type borderTopLeftRadius = lengthPercentage;
export type borderTopRightRadius = lengthPercentage;
export type borderTopStyle = brStyle;
export type borderTopWidth = borderWidth;
export type boxAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
export type boxDecorationBreak = 'slice' | 'clone';
export type boxDirection = 'normal' | 'reverse' | 'inherit';
export type boxFlex = number;
export type boxFlexGroup = number;
export type boxLines = 'single' | 'multiple';
export type boxOrdinalGroup = number;
export type boxOrient =
  | 'horizontal'
  | 'vertical'
  | 'inline-axis'
  | 'block-axis'
  | 'inherit';
export type boxPack = 'start' | 'center' | 'end' | 'justify';
type boxShadowSyntax = {|
  x?: number,
  y?: number,
  blur?: number,
  spread?: number,
  color?: string,
  inset?: boolean,
|};
export type boxShadow =
  | 'none'
  | string
  | boxShadowSyntax
  | Array<string | boxShadowSyntax>;
export type boxSizing = 'content-box' | 'border-box';
export type boxSuppress = 'show' | 'discard' | 'hide';
export type breakAfter =
  | 'auto'
  | 'avoid'
  | 'avoid-page'
  | 'page'
  | 'left'
  | 'right'
  | 'recto'
  | 'verso'
  | 'avoid-column'
  | 'column'
  | 'avoid-region'
  | 'region';
export type breakBefore =
  | 'auto'
  | 'avoid'
  | 'avoid-page'
  | 'page'
  | 'left'
  | 'right'
  | 'recto'
  | 'verso'
  | 'avoid-column'
  | 'column'
  | 'avoid-region'
  | 'region';
export type breakInside =
  | 'auto'
  | 'avoid'
  | 'avoid-page'
  | 'avoid-column'
  | 'avoid-region';
export type captionSide =
  | 'top'
  | 'bottom'
  | 'block-start'
  | 'block-end'
  | 'inline-start'
  | 'inline-end';
export type clear =
  | 'none'
  | 'left'
  | 'right'
  | 'both'
  | 'inline-start'
  | 'inline-end';
export type clip = string | 'auto';
export type clipPath = string | 'none';
export type columnCount = number | 'auto';
export type columnFill = 'auto' | 'balance';
export type columnGap = number | 'normal';
export type columnRule = columnRuleWidth | columnRuleStyle | columnRuleColor;
export type columnRuleColor = color;
export type columnRuleStyle = brStyle;
export type columnRuleWidth = borderWidth;
export type columnSpan = 'none' | 'all';
export type columnWidth = number | 'auto';
export type columns = columnWidth | columnCount;
export type contain = 'none' | 'strict' | 'content' | string;
export type content = string;
export type counterIncrement = string | 'none';
export type counterReset = string | 'none';
export type cursor =
  | 'auto'
  | 'default'
  | 'none'
  | 'context-menu'
  | 'help'
  | 'pointer'
  | 'progress'
  | 'wait'
  | 'cell'
  | 'crosshair'
  | 'text'
  | 'vertical-text'
  | 'alias'
  | 'copy'
  | 'move'
  | 'no-drop'
  | 'not-allowed'
  | 'e-resize'
  | 'n-resize'
  | 'ne-resize'
  | 'nw-resize'
  | 's-resize'
  | 'se-resize'
  | 'sw-resize'
  | 'w-resize'
  | 'ew-resize'
  | 'ns-resize'
  | 'nesw-resize'
  | 'nwse-resize'
  | 'col-resize'
  | 'row-resize'
  | 'all-scroll'
  | 'zoom-in'
  | 'zoom-out'
  | 'grab'
  | 'grabbing'
  | '-webkit-grab'
  | '-webkit-grabbing';
export type direction = 'ltr' | 'rtl';
export type display =
  | 'none'
  | 'inline'
  | 'block'
  | 'list-item'
  | 'inline-list-item'
  | 'inline-block'
  | 'inline-table'
  | 'table'
  | 'table-cell'
  | 'table-column'
  | 'table-column-group'
  | 'table-footer-group'
  | 'table-header-group'
  | 'table-row'
  | 'table-row-group'
  | 'flex'
  | 'inline-flex'
  | 'grid'
  | 'inline-grid'
  | 'run-in'
  | 'ruby'
  | 'ruby-base'
  | 'ruby-text'
  | 'ruby-base-container'
  | 'ruby-text-container'
  | 'contents';
export type displayInside =
  | 'auto'
  | 'block'
  | 'table'
  | 'flex'
  | 'grid'
  | 'ruby';
export type displayList = 'none' | 'list-item';
export type displayOutside =
  | 'block-level'
  | 'inline-level'
  | 'run-in'
  | 'contents'
  | 'none'
  | 'table-row-group'
  | 'table-header-group'
  | 'table-footer-group'
  | 'table-row'
  | 'table-cell'
  | 'table-column-group'
  | 'table-column'
  | 'table-caption'
  | 'ruby-base'
  | 'ruby-text'
  | 'ruby-base-container'
  | 'ruby-text-container';
export type emptyCells = 'show' | 'hide';
export type filter = 'none' | string;
export type flex = 'none' | string | number;
export type flexBasis = 'content' | number | string;
export type flexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type flexFlow = flexDirection | flexWrap;
export type flexGrow = number;
export type flexShrink = number;
export type flexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type float = 'left' | 'right' | 'none' | 'inline-start' | 'inline-end';
export type font =
  | string
  | 'caption'
  | 'icon'
  | 'menu'
  | 'message-box'
  | 'small-caption'
  | 'status-bar';
export type fontFamily = string;
export type fontFeatureSettings = 'normal' | string;
export type fontKerning = 'auto' | 'normal' | 'none';
export type fontLanguageOverride = 'normal' | string;
export type fontSize = absoluteSize | relativeSize | lengthPercentage;
export type fontSizeAdjust = 'none' | number;
export type fontStretch =
  | 'normal'
  | 'ultra-condensed'
  | 'extra-condensed'
  | 'condensed'
  | 'semi-condensed'
  | 'semi-expanded'
  | 'expanded'
  | 'extra-expanded'
  | 'ultra-expanded';
export type fontStyle = 'normal' | 'italic' | 'oblique';
export type fontSynthesis = 'none' | string;
export type fontVariant = 'normal' | 'none' | string;
export type fontVariantAlternates = 'normal' | string;
export type fontVariantCaps =
  | 'normal'
  | 'small-caps'
  | 'all-small-caps'
  | 'petite-caps'
  | 'all-petite-caps'
  | 'unicase'
  | 'titling-caps';
export type fontVariantEastAsian = 'normal' | string;
export type fontVariantLigatures = 'normal' | 'none' | string;
export type fontVariantNumeric = 'normal' | string;
export type fontVariantPosition = 'normal' | 'sub' | 'super';
export type fontWeight =
  | 'inherit'
  | 'normal'
  | 'bold'
  | 'bolder'
  | 'lighter'
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;
export type grid = gridTemplate | string;
export type gridArea = gridLine | string;
export type gridAutoColumns = trackSize;
export type gridAutoFlow = string | 'dense';
export type gridAutoRows = trackSize;
export type gridColumn = gridLine | string;
export type gridColumnEnd = gridLine;
export type gridColumnGap = lengthPercentage;
export type gridColumnStart = gridLine;
export type gridGap = gridRowGap | gridColumnGap;
export type gridRow = gridLine | string;
export type gridRowEnd = gridLine;
export type gridRowGap = lengthPercentage;
export type gridRowStart = gridLine;
export type gridTemplate = 'none' | 'subgrid' | string;
export type gridTemplateAreas = 'none' | string;
export type gridTemplateColumns = 'none' | 'subgrid' | string;
export type gridTemplateRows = 'none' | 'subgrid' | string;
export type hyphens = 'none' | 'manual' | 'auto';
export type imageOrientation = 'from-image' | number | string;
export type imageRendering =
  | 'auto'
  | 'crisp-edges'
  | 'pixelated'
  | 'optimizeSpeed'
  | 'optimizeQuality'
  | string;
export type imageResolution = string | 'snap';
export type imeMode = 'auto' | 'normal' | 'active' | 'inactive' | 'disabled';
export type initialLetter = 'normal' | string;
export type initialLetterAlign = string;
export type inlineSize = width;
export type isolation = 'auto' | 'isolate';
export type justifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around';
export type letterSpacing = 'normal' | lengthPercentage;
export type lineBreak = 'auto' | 'loose' | 'normal' | 'strict';
export type lineHeight = 'normal' | number | string;
export type listStyle = listStyleType | listStylePosition | listStyleImage;
export type listStyleImage = string | 'none';
export type listStylePosition = 'inside' | 'outside';
export type listStyleType = string | 'none';
type marginSyntax = {|
  vertical?: number | string,
  horizontal?: number | string,
  top?: number | string,
  left?: number | string,
  right?: number | string,
  bottom?: number | string,
|};
export type margin = number | string | marginSyntax;
export type marginBlockEnd = marginLeft;
export type marginBlockStart = marginLeft;
export type marginBottom = number | string | 'auto';
export type marginInlineEnd = marginLeft;
export type marginInlineStart = marginLeft;
export type marginLeft = number | string | 'auto';
export type marginRight = number | string | 'auto';
export type marginTop = number | string | 'auto';
export type markerOffset = number | 'auto';
export type mask = maskLayer;
export type maskClip = string;
export type maskComposite = compositeOperator;
export type maskMode = maskingMode;
export type maskOrigin = geometryBox;
export type maskPosition = string;
export type maskRepeat = repeatStyle;
export type maskSize = bgSize;
export type maskType = 'luminance' | 'alpha';
export type maxBlockSize = maxWidth;
export type maxHeight =
  | number
  | string
  | 'none'
  | 'max-content'
  | 'min-content'
  | 'fit-content'
  | 'fill-available';
export type maxInlineSize = maxWidth;
export type maxWidth =
  | number
  | string
  | 'none'
  | 'max-content'
  | 'min-content'
  | 'fit-content'
  | 'fill-available';
export type minBlockSize = minWidth;
export type minHeight =
  | number
  | string
  | 'auto'
  | 'max-content'
  | 'min-content'
  | 'fit-content'
  | 'fill-available';
export type minInlineSize = minWidth;
export type minWidth =
  | number
  | string
  | 'auto'
  | 'max-content'
  | 'min-content'
  | 'fit-content'
  | 'fill-available';
export type mixBlendMode = blendMode;
export type motion = motionPath | motionOffset | motionRotation;
export type motionOffset = lengthPercentage;
export type motionPath = string | geometryBox | 'none';
export type motionRotation = string | number;
export type objectFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
export type objectPosition = string;
export type offsetBlockEnd = string;
export type offsetBlockStart = string;
export type offsetInlineEnd = string;
export type offsetInlineStart = string;
export type opacity = number;
export type order = number;
export type orphans = number;
type outlineSyntax = {|
  width?: borderWidth,
  style?: brStyle,
  color?: color,
|};
export type outline = string | outlineSyntax;
export type outlineColor = color | 'invert';
export type outlineOffset = number;
export type outlineStyle = 'auto' | brStyle;
export type outlineWidth = borderWidth;
export type overflow = 'visible' | 'hidden' | 'scroll' | 'auto';
export type overflowClipBox = 'padding-box' | 'content-box';
export type overflowWrap = 'normal' | 'break-word';
export type overflowX = 'visible' | 'hidden' | 'scroll' | 'auto';
export type overflowY = 'visible' | 'hidden' | 'scroll' | 'auto';
type paddingSyntax = {|
  vertical?: number | string,
  horizontal?: number | string,
  top?: number | string,
  left?: number | string,
  right?: number | string,
  bottom?: number | string,
|};
export type padding = number | string | paddingSyntax;
export type paddingBlockEnd = paddingLeft;
export type paddingBlockStart = paddingLeft;
export type paddingBottom = number | string;
export type paddingInlineEnd = paddingLeft;
export type paddingInlineStart = paddingLeft;
export type paddingLeft = number | string;
export type paddingRight = number | string;
export type paddingTop = number | string;
export type pageBreakAfter = 'auto' | 'always' | 'avoid' | 'left' | 'right';
export type pageBreakBefore = 'auto' | 'always' | 'avoid' | 'left' | 'right';
export type pageBreakInside = 'auto' | 'avoid';
export type perspective = 'none' | number;
export type perspectiveOrigin = string;
export type pointerEvents =
  | 'auto'
  | 'none'
  | 'visiblePainted'
  | 'visibleFill'
  | 'visibleStroke'
  | 'visible'
  | 'painted'
  | 'fill'
  | 'stroke'
  | 'all'
  | 'inherit';
export type position = 'static' | 'relative' | 'absolute' | 'sticky' | 'fixed';
export type quotes = string | 'none';
export type resize = 'none' | 'both' | 'horizontal' | 'vertical';
export type rubyAlign = 'start' | 'center' | 'space-between' | 'space-around';
export type rubyMerge = 'separate' | 'collapse' | 'auto';
export type rubyPosition = 'over' | 'under' | 'inter-character';
export type scrollBehavior = 'auto' | 'smooth';
export type scrollSnapCoordinate = 'none' | string;
export type scrollSnapDestination = string;
export type scrollSnapPointsX = 'none' | string;
export type scrollSnapPointsY = 'none' | string;
export type scrollSnapType = 'none' | 'mandatory' | 'proximity';
export type scrollSnapTypeX = 'none' | 'mandatory' | 'proximity';
export type scrollSnapTypeY = 'none' | 'mandatory' | 'proximity';
export type shapeImageThreshold = number;
export type shapeMargin = lengthPercentage;
export type shapeOutside = 'none' | shapeBox | string;
export type tabSize = number;
export type tableLayout = 'auto' | 'fixed';
export type textAlign =
  | 'start'
  | 'end'
  | 'left'
  | 'right'
  | 'center'
  | 'justify'
  | 'match-parent';
export type textAlignLast =
  | 'auto'
  | 'start'
  | 'end'
  | 'left'
  | 'right'
  | 'center'
  | 'justify';
export type textCombineUpright = 'none' | 'all' | string;
export type textDecoration =
  | textDecorationLine
  | textDecorationStyle
  | textDecorationColor;
export type textDecorationColor = color;
export type textDecorationLine = 'none' | string;
export type textDecorationSkip = 'none' | string;
export type textDecorationStyle =
  | 'solid'
  | 'double'
  | 'dotted'
  | 'dashed'
  | 'wavy';
export type textEmphasis = textEmphasisStyle | textEmphasisColor;
export type textEmphasisColor = color;
export type textEmphasisPosition = string;
export type textEmphasisStyle = 'none' | string;
export type textIndent = string | 'hanging' | 'each-line';
export type textOrientation = 'mixed' | 'upright' | 'sideways';
export type textOverflow = string;
export type textRendering =
  | 'auto'
  | 'optimizeSpeed'
  | 'optimizeLegibility'
  | 'geometricPrecision';
type textShadowSyntax = {|
  x?: number,
  y?: number,
  blur?: number,
  color?: string,
|};
export type textShadow = 'none' | string | textShadowSyntax;
export type textSizeAdjust = 'none' | 'auto' | string;
export type textTransform =
  | 'none'
  | 'capitalize'
  | 'uppercase'
  | 'lowercase'
  | 'full-width';
export type textUnderlinePosition = 'auto' | string;
export type touchAction = 'auto' | 'none' | string | 'manipulation';
export type transform = 'none' | string;
export type transformBox = 'border-box' | 'fill-box' | 'view-box';
export type transformOrigin = string | number;
export type transformStyle = 'flat' | 'preserve-3d';
type transitionSyntax = {|
  property?: 'none' | singleTransitionProperty,
  duration?: number,
  timingFunction?: singleTransitionTimingFunction,
  delay?: number,
|};
export type transition =
  | singleTransition
  | transitionSyntax
  | Array<singleTransition | transitionSyntax>;
export type transitionDelay = number;
export type transitionDuration = number;
export type transitionProperty = 'none' | singleTransitionProperty;
export type transitionTimingFunction = singleTransitionTimingFunction;
export type unicodeBidi =
  | 'normal'
  | 'embed'
  | 'isolate'
  | 'bidi-override'
  | 'isolate-override'
  | 'plaintext';
export type userSelect = 'auto' | 'text' | 'none' | 'contain' | 'all';
export type verticalAlign =
  | 'baseline'
  | 'sub'
  | 'super'
  | 'text-top'
  | 'text-bottom'
  | 'middle'
  | 'top'
  | 'bottom'
  | string
  | number;
export type visibility = 'visible' | 'hidden' | 'collapse';
export type whiteSpace = 'normal' | 'pre' | 'nowrap' | 'pre-wrap' | 'pre-line';
export type widows = number;
export type width =
  | string
  | 'available'
  | 'min-content'
  | 'max-content'
  | 'fit-content'
  | 'auto';
export type willChange = 'auto' | animatableFeature;
export type wordBreak =
  | 'normal'
  | 'break-all'
  | 'keep-all'
  | nonStandardWordBreak;
export type wordSpacing = 'normal' | lengthPercentage;
export type wordWrap = 'normal' | 'break-word';
export type writingMode =
  | 'horizontal-tb'
  | 'vertical-rl'
  | 'vertical-lr'
  | 'sideways-rl'
  | 'sideways-lr'
  | svgWritingMode;
export type zIndex = 'auto' | number;
export type alignmentBaseline =
  | 'auto'
  | 'baseline'
  | 'before-edge'
  | 'text-before-edge'
  | 'middle'
  | 'central'
  | 'after-edge'
  | 'text-after-edge'
  | 'ideographic'
  | 'alphabetic'
  | 'hanging'
  | 'mathematical';
export type baselineShift = 'baseline' | 'sub' | 'super' | svgLength;
export type behavior = string;
export type clipRule = 'nonzero' | 'evenodd';
export type cue = cueBefore | cueAfter;
export type cueAfter = string | number | 'none';
export type cueBefore = string | number | 'none';
export type dominantBaseline =
  | 'auto'
  | 'use-script'
  | 'no-change'
  | 'reset-size'
  | 'ideographic'
  | 'alphabetic'
  | 'hanging'
  | 'mathematical'
  | 'central'
  | 'middle'
  | 'text-after-edge'
  | 'text-before-edge';
export type fill = paint;
export type fillOpacity = number;
export type fillRule = 'nonzero' | 'evenodd';
export type glyphOrientationHorizontal = number;
export type glyphOrientationVertical = number;
export type kerning = 'auto' | svgLength;
export type marker = 'none' | string;
export type markerEnd = 'none' | string;
export type markerMid = 'none' | string;
export type markerStart = 'none' | string;
export type pause = pauseBefore | pauseAfter;
export type pauseAfter =
  | number
  | 'none'
  | 'x-weak'
  | 'weak'
  | 'medium'
  | 'strong'
  | 'x-strong';
export type pauseBefore =
  | number
  | 'none'
  | 'x-weak'
  | 'weak'
  | 'medium'
  | 'strong'
  | 'x-strong';
export type rest = restBefore | restAfter;
export type restAfter =
  | number
  | 'none'
  | 'x-weak'
  | 'weak'
  | 'medium'
  | 'strong'
  | 'x-strong';
export type restBefore =
  | number
  | 'none'
  | 'x-weak'
  | 'weak'
  | 'medium'
  | 'strong'
  | 'x-strong';
export type shapeRendering =
  | 'auto'
  | 'optimizeSpeed'
  | 'crispEdges'
  | 'geometricPrecision';
export type src = string;
export type speak = 'auto' | 'none' | 'normal';
export type speakAs = 'normal' | 'spell-out' | 'digits' | string;
export type stroke = paint;
export type strokeDasharray = 'none' | string;
export type strokeDashoffset = svgLength;
export type strokeLinecap = 'butt' | 'round' | 'square';
export type strokeLinejoin = 'miter' | 'round' | 'bevel';
export type strokeMiterlimit = number;
export type strokeOpacity = number;
export type strokeWidth = svgLength;
export type textAnchor = 'start' | 'middle' | 'end';
export type unicodeRange = string;
export type voiceBalance =
  | number
  | 'left'
  | 'center'
  | 'right'
  | 'leftwards'
  | 'rightwards';
export type voiceDuration = 'auto' | number;
export type voiceFamily = string | 'preserve';
export type voicePitch = number | 'absolute' | string;
export type voiceRange = number | 'absolute' | string;
export type voiceRate = string;
export type voiceStress = 'normal' | 'strong' | 'moderate' | 'none' | 'reduced';
export type voiceVolume = 'silent' | string;
export type zoom = 'normal' | 'reset' | number | string;
export type absoluteSize =
  | 'xx-small'
  | 'x-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'x-large'
  | 'xx-large';
export type animatableFeature = 'scroll-position' | 'contents' | string;
export type attachment = 'scroll' | 'fixed' | 'local';
export type bgImage = 'none' | string;
export type bgSize = string | 'cover' | 'contain';
export type box = 'border-box' | 'padding-box' | 'content-box';
export type brStyle =
  | 'none'
  | 'hidden'
  | 'dotted'
  | 'dashed'
  | 'solid'
  | 'double'
  | 'groove'
  | 'ridge'
  | 'inset'
  | 'outset';
export type borderWidth = number | 'thin' | 'medium' | 'thick' | string;
export type color = string;
export type compositeStyle =
  | 'clear'
  | 'copy'
  | 'source-over'
  | 'source-in'
  | 'source-out'
  | 'source-atop'
  | 'destination-over'
  | 'destination-in'
  | 'destination-out'
  | 'destination-atop'
  | 'xor';
export type compositeOperator = 'add' | 'subtract' | 'intersect' | 'exclude';
export type finalBgLayer =
  | bgImage
  | string
  | repeatStyle
  | attachment
  | box
  | backgroundColor;
export type geometryBox = shapeBox | 'fill-box' | 'stroke-box' | 'view-box';
export type gridLine = 'auto' | string;
export type lengthPercentage = number | string;
export type maskLayer =
  | maskReference
  | maskingMode
  | string
  | repeatStyle
  | geometryBox
  | compositeOperator;
export type maskReference = 'none' | string;
export type maskingMode = 'alpha' | 'luminance' | 'match-source';
export type relativeSize = 'larger' | 'smaller';
export type repeatStyle = 'repeat-x' | 'repeat-y' | string;
export type shapeBox = box | 'margin-box';
export type singleAnimation =
  | number
  | singleTimingFunction
  | singleAnimationIterationCount
  | singleAnimationDirection
  | singleAnimationFillMode
  | singleAnimationPlayState
  | singleAnimationName;
export type singleAnimationDirection =
  | 'normal'
  | 'reverse'
  | 'alternate'
  | 'alternate-reverse';
export type singleAnimationFillMode =
  | 'none'
  | 'forwards'
  | 'backwards'
  | 'both';
export type singleAnimationIterationCount = number;
export type singleAnimationName = 'none' | string;
export type singleAnimationPlayState = 'running' | 'paused';
export type singleTimingFunction = singleTransitionTimingFunction;
export type singleTransition = singleTransitionTimingFunction | string | number;
export type singleTransitionTimingFunction =
  | 'ease'
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'step-start'
  | 'step-end'
  | string;
export type singleTransitionProperty = 'all' | string;
export type trackBreadth =
  | lengthPercentage
  | string
  | 'min-content'
  | 'max-content'
  | 'auto';
export type trackSize = trackBreadth | string;
export type nonStandardWordBreak = 'break-word';
export type blendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';
export type maskImage = maskReference;
export type outlineRadius = borderRadius;
export type paint = 'none' | 'currentColor' | color | string;
export type svgLength = string | number;
export type svgWritingMode = 'lr-tb' | 'rl-tb' | 'tb-rl' | 'lr' | 'rl' | 'tb';

export type CSSPropertyValue<Value> =
  | Value
  | ((props: Object, context: Object) => ?Value);

export type CSSPropertySet = {|
  alignContent?: CSSPropertyValue<alignContent>,
  alignItems?: CSSPropertyValue<alignItems>,
  alignSelf?: CSSPropertyValue<alignSelf>,
  all?: CSSPropertyValue<all>,
  animation?: CSSPropertyValue<animation>,
  animationDelay?: CSSPropertyValue<animationDelay>,
  animationDirection?: CSSPropertyValue<animationDirection>,
  animationDuration?: CSSPropertyValue<animationDuration>,
  animationFillMode?: CSSPropertyValue<animationFillMode>,
  animationIterationCount?: CSSPropertyValue<animationIterationCount>,
  animationName?: CSSPropertyValue<animationName>,
  animationPlayState?: CSSPropertyValue<animationPlayState>,
  animationTimingFunction?: CSSPropertyValue<animationTimingFunction>,
  appearance?: CSSPropertyValue<appearance>,
  azimuth?: CSSPropertyValue<azimuth>,
  backdropFilter?: CSSPropertyValue<backdropFilter>,
  backfaceVisibility?: CSSPropertyValue<backfaceVisibility>,
  background?: CSSPropertyValue<background>,
  backgroundAttachment?: CSSPropertyValue<backgroundAttachment>,
  backgroundBlendMode?: CSSPropertyValue<backgroundBlendMode>,
  backgroundClip?: CSSPropertyValue<backgroundClip>,
  backgroundColor?: CSSPropertyValue<backgroundColor>,
  backgroundImage?: CSSPropertyValue<backgroundImage>,
  backgroundOrigin?: CSSPropertyValue<backgroundOrigin>,
  backgroundPosition?: CSSPropertyValue<backgroundPosition>,
  backgroundPositionX?: CSSPropertyValue<backgroundPositionX>,
  backgroundPositionY?: CSSPropertyValue<backgroundPositionY>,
  backgroundRepeat?: CSSPropertyValue<backgroundRepeat>,
  backgroundSize?: CSSPropertyValue<backgroundSize>,
  blockSize?: CSSPropertyValue<blockSize>,
  border?: CSSPropertyValue<border>,
  borderBlockEnd?: CSSPropertyValue<borderBlockEnd>,
  borderBlockEndColor?: CSSPropertyValue<borderBlockEndColor>,
  borderBlockEndStyle?: CSSPropertyValue<borderBlockEndStyle>,
  borderBlockEndWidth?: CSSPropertyValue<borderBlockEndWidth>,
  borderBlockStart?: CSSPropertyValue<borderBlockStart>,
  borderBlockStartColor?: CSSPropertyValue<borderBlockStartColor>,
  borderBlockStartStyle?: CSSPropertyValue<borderBlockStartStyle>,
  borderBlockStartWidth?: CSSPropertyValue<borderBlockStartWidth>,
  borderBottom?: CSSPropertyValue<border>,
  borderBottomColor?: CSSPropertyValue<color>,
  borderBottomLeftRadius?: CSSPropertyValue<borderBottomLeftRadius>,
  borderBottomRightRadius?: CSSPropertyValue<borderBottomRightRadius>,
  borderBottomStyle?: CSSPropertyValue<borderBottomStyle>,
  borderBottomWidth?: CSSPropertyValue<borderBottomWidth>,
  borderCollapse?: CSSPropertyValue<borderCollapse>,
  borderColor?: CSSPropertyValue<borderColor>,
  borderImage?: CSSPropertyValue<borderImage>,
  borderImageOutset?: CSSPropertyValue<borderImageOutset>,
  borderImageRepeat?: CSSPropertyValue<borderImageRepeat>,
  borderImageSlice?: CSSPropertyValue<borderImageSlice>,
  borderImageSource?: CSSPropertyValue<borderImageSource>,
  borderImageWidth?: CSSPropertyValue<borderImageWidth>,
  borderInlineEnd?: CSSPropertyValue<borderInlineEnd>,
  borderInlineEndColor?: CSSPropertyValue<borderInlineEndColor>,
  borderInlineEndStyle?: CSSPropertyValue<borderInlineEndStyle>,
  borderInlineEndWidth?: CSSPropertyValue<borderInlineEndWidth>,
  borderInlineStart?: CSSPropertyValue<borderInlineStart>,
  borderInlineStartColor?: CSSPropertyValue<borderInlineStartColor>,
  borderInlineStartStyle?: CSSPropertyValue<borderInlineStartStyle>,
  borderInlineStartWidth?: CSSPropertyValue<borderInlineStartWidth>,
  borderLeft?: CSSPropertyValue<border>,
  borderLeftColor?: CSSPropertyValue<borderLeftColor>,
  borderLeftStyle?: CSSPropertyValue<borderLeftStyle>,
  borderLeftWidth?: CSSPropertyValue<borderLeftWidth>,
  borderRadius?: CSSPropertyValue<borderRadius>,
  borderRight?: CSSPropertyValue<border>,
  borderRightColor?: CSSPropertyValue<borderRightColor>,
  borderRightStyle?: CSSPropertyValue<borderRightStyle>,
  borderRightWidth?: CSSPropertyValue<borderRightWidth>,
  borderSpacing?: CSSPropertyValue<borderSpacing>,
  borderStyle?: CSSPropertyValue<borderStyle>,
  borderTop?: CSSPropertyValue<border>,
  borderTopColor?: CSSPropertyValue<color>,
  borderTopLeftRadius?: CSSPropertyValue<borderTopLeftRadius>,
  borderTopRightRadius?: CSSPropertyValue<borderTopRightRadius>,
  borderTopStyle?: CSSPropertyValue<borderTopStyle>,
  borderTopWidth?: CSSPropertyValue<borderTopWidth>,
  borderWidth?: CSSPropertyValue<borderWidth>,
  bottom?: CSSPropertyValue<number | string>,
  boxAlign?: CSSPropertyValue<boxAlign>,
  boxDecorationBreak?: CSSPropertyValue<boxDecorationBreak>,
  boxDirection?: CSSPropertyValue<boxDirection>,
  boxFlex?: CSSPropertyValue<boxFlex>,
  boxFlexGroup?: CSSPropertyValue<boxFlexGroup>,
  boxLines?: CSSPropertyValue<boxLines>,
  boxOrdinalGroup?: CSSPropertyValue<boxOrdinalGroup>,
  boxOrient?: CSSPropertyValue<boxOrient>,
  boxPack?: CSSPropertyValue<boxPack>,
  boxShadow?: CSSPropertyValue<boxShadow>,
  boxSizing?: CSSPropertyValue<boxSizing>,
  boxSuppress?: CSSPropertyValue<boxSuppress>,
  breakAfter?: CSSPropertyValue<breakAfter>,
  breakBefore?: CSSPropertyValue<breakBefore>,
  breakInside?: CSSPropertyValue<breakInside>,
  captionSide?: CSSPropertyValue<captionSide>,
  clear?: CSSPropertyValue<clear>,
  clip?: CSSPropertyValue<clip>,
  clipPath?: CSSPropertyValue<clipPath>,
  color?: CSSPropertyValue<color>,
  columnCount?: CSSPropertyValue<columnCount>,
  columnFill?: CSSPropertyValue<columnFill>,
  columnGap?: CSSPropertyValue<columnGap>,
  columnRule?: CSSPropertyValue<columnRule>,
  columnRuleColor?: CSSPropertyValue<columnRuleColor>,
  columnRuleStyle?: CSSPropertyValue<columnRuleStyle>,
  columnRuleWidth?: CSSPropertyValue<columnRuleWidth>,
  columnSpan?: CSSPropertyValue<columnSpan>,
  columnWidth?: CSSPropertyValue<columnWidth>,
  columns?: CSSPropertyValue<columns>,
  contain?: CSSPropertyValue<contain>,
  content?: CSSPropertyValue<content>,
  counterIncrement?: CSSPropertyValue<counterIncrement>,
  counterReset?: CSSPropertyValue<counterReset>,
  cursor?: CSSPropertyValue<cursor>,
  direction?: CSSPropertyValue<direction>,
  display?: CSSPropertyValue<display>,
  displayInside?: CSSPropertyValue<displayInside>,
  displayList?: CSSPropertyValue<displayList>,
  displayOutside?: CSSPropertyValue<displayOutside>,
  emptyCells?: CSSPropertyValue<emptyCells>,
  filter?: CSSPropertyValue<filter>,
  flex?: CSSPropertyValue<flex>,
  flexBasis?: CSSPropertyValue<flexBasis>,
  flexDirection?: CSSPropertyValue<flexDirection>,
  flexFlow?: CSSPropertyValue<flexFlow>,
  flexGrow?: CSSPropertyValue<flexGrow>,
  flexShrink?: CSSPropertyValue<flexShrink>,
  flexWrap?: CSSPropertyValue<flexWrap>,
  float?: CSSPropertyValue<float>,
  font?: CSSPropertyValue<font>,
  fontFamily?: CSSPropertyValue<fontFamily>,
  fontFeatureSettings?: CSSPropertyValue<fontFeatureSettings>,
  fontKerning?: CSSPropertyValue<fontKerning>,
  fontLanguageOverride?: CSSPropertyValue<fontLanguageOverride>,
  fontSize?: CSSPropertyValue<fontSize>,
  fontSizeAdjust?: CSSPropertyValue<fontSizeAdjust>,
  fontStretch?: CSSPropertyValue<fontStretch>,
  fontStyle?: CSSPropertyValue<fontStyle>,
  fontSynthesis?: CSSPropertyValue<fontSynthesis>,
  fontVariant?: CSSPropertyValue<fontVariant>,
  fontVariantAlternates?: CSSPropertyValue<fontVariantAlternates>,
  fontVariantCaps?: CSSPropertyValue<fontVariantCaps>,
  fontVariantEastAsian?: CSSPropertyValue<fontVariantEastAsian>,
  fontVariantLigatures?: CSSPropertyValue<fontVariantLigatures>,
  fontVariantNumeric?: CSSPropertyValue<fontVariantNumeric>,
  fontVariantPosition?: CSSPropertyValue<fontVariantPosition>,
  fontWeight?: CSSPropertyValue<fontWeight>,
  grid?: CSSPropertyValue<grid>,
  gridArea?: CSSPropertyValue<gridArea>,
  gridAutoColumns?: CSSPropertyValue<gridAutoColumns>,
  gridAutoFlow?: CSSPropertyValue<gridAutoFlow>,
  gridAutoRows?: CSSPropertyValue<gridAutoRows>,
  gridColumn?: CSSPropertyValue<gridColumn>,
  gridColumnEnd?: CSSPropertyValue<gridColumnEnd>,
  gridColumnGap?: CSSPropertyValue<gridColumnGap>,
  gridColumnStart?: CSSPropertyValue<gridColumnStart>,
  gridGap?: CSSPropertyValue<gridGap>,
  gridRow?: CSSPropertyValue<gridRow>,
  gridRowEnd?: CSSPropertyValue<gridRowEnd>,
  gridRowGap?: CSSPropertyValue<gridRowGap>,
  gridRowStart?: CSSPropertyValue<gridRowStart>,
  gridTemplate?: CSSPropertyValue<gridTemplate>,
  gridTemplateAreas?: CSSPropertyValue<gridTemplateAreas>,
  gridTemplateColumns?: CSSPropertyValue<gridTemplateColumns>,
  gridTemplateRows?: CSSPropertyValue<gridTemplateRows>,
  height?: CSSPropertyValue<number | string>,
  hyphens?: CSSPropertyValue<hyphens>,
  imageOrientation?: CSSPropertyValue<imageOrientation>,
  imageRendering?: CSSPropertyValue<imageRendering>,
  imageResolution?: CSSPropertyValue<imageResolution>,
  imeMode?: CSSPropertyValue<imeMode>,
  initialLetter?: CSSPropertyValue<initialLetter>,
  initialLetterAlign?: CSSPropertyValue<initialLetterAlign>,
  inlineSize?: CSSPropertyValue<inlineSize>,
  isolation?: CSSPropertyValue<isolation>,
  justifyContent?: CSSPropertyValue<justifyContent>,
  left?: CSSPropertyValue<number | string>,
  letterSpacing?: CSSPropertyValue<letterSpacing>,
  lineBreak?: CSSPropertyValue<lineBreak>,
  lineHeight?: CSSPropertyValue<lineHeight>,
  listStyle?: CSSPropertyValue<listStyle>,
  listStyleImage?: CSSPropertyValue<listStyleImage>,
  listStylePosition?: CSSPropertyValue<listStylePosition>,
  listStyleType?: CSSPropertyValue<listStyleType>,
  margin?: CSSPropertyValue<margin>,
  marginBlockEnd?: CSSPropertyValue<marginBlockEnd>,
  marginBlockStart?: CSSPropertyValue<marginBlockStart>,
  marginBottom?: CSSPropertyValue<marginBottom>,
  marginInlineEnd?: CSSPropertyValue<marginInlineEnd>,
  marginInlineStart?: CSSPropertyValue<marginInlineStart>,
  marginLeft?: CSSPropertyValue<marginLeft>,
  marginRight?: CSSPropertyValue<marginRight>,
  marginTop?: CSSPropertyValue<marginTop>,
  markerOffset?: CSSPropertyValue<markerOffset>,
  mask?: CSSPropertyValue<mask>,
  maskClip?: CSSPropertyValue<maskClip>,
  maskComposite?: CSSPropertyValue<maskComposite>,
  maskImage?: CSSPropertyValue<maskImage>,
  maskMode?: CSSPropertyValue<maskMode>,
  maskOrigin?: CSSPropertyValue<maskOrigin>,
  maskPosition?: CSSPropertyValue<maskPosition>,
  maskRepeat?: CSSPropertyValue<maskRepeat>,
  maskSize?: CSSPropertyValue<maskSize>,
  maskType?: CSSPropertyValue<maskType>,
  maxBlockSize?: CSSPropertyValue<maxBlockSize>,
  maxHeight?: CSSPropertyValue<maxHeight>,
  maxInlineSize?: CSSPropertyValue<maxInlineSize>,
  maxWidth?: CSSPropertyValue<maxWidth>,
  minBlockSize?: CSSPropertyValue<minBlockSize>,
  minHeight?: CSSPropertyValue<minHeight>,
  minInlineSize?: CSSPropertyValue<minInlineSize>,
  minWidth?: CSSPropertyValue<minWidth>,
  mixBlendMode?: CSSPropertyValue<mixBlendMode>,
  motion?: CSSPropertyValue<motion>,
  motionOffset?: CSSPropertyValue<motionOffset>,
  motionPath?: CSSPropertyValue<motionPath>,
  motionRotation?: CSSPropertyValue<motionRotation>,
  objectFit?: CSSPropertyValue<objectFit>,
  objectPosition?: CSSPropertyValue<objectPosition>,
  offsetBlockEnd?: CSSPropertyValue<offsetBlockEnd>,
  offsetBlockStart?: CSSPropertyValue<offsetBlockStart>,
  offsetInlineEnd?: CSSPropertyValue<offsetInlineEnd>,
  offsetInlineStart?: CSSPropertyValue<offsetInlineStart>,
  opacity?: CSSPropertyValue<opacity>,
  order?: CSSPropertyValue<order>,
  orphans?: CSSPropertyValue<orphans>,
  outline?: CSSPropertyValue<outline>,
  outlineColor?: CSSPropertyValue<outlineColor>,
  outlineOffset?: CSSPropertyValue<outlineOffset>,
  outlineStyle?: CSSPropertyValue<outlineStyle>,
  outlineWidth?: CSSPropertyValue<outlineWidth>,
  overflow?: CSSPropertyValue<overflow>,
  overflowClipBox?: CSSPropertyValue<overflowClipBox>,
  overflowWrap?: CSSPropertyValue<overflowWrap>,
  overflowX?: CSSPropertyValue<overflowX>,
  overflowY?: CSSPropertyValue<overflowY>,
  padding?: CSSPropertyValue<padding>,
  paddingBlockEnd?: CSSPropertyValue<paddingBlockEnd>,
  paddingBlockStart?: CSSPropertyValue<paddingBlockStart>,
  paddingBottom?: CSSPropertyValue<paddingBottom>,
  paddingInlineEnd?: CSSPropertyValue<paddingInlineEnd>,
  paddingInlineStart?: CSSPropertyValue<paddingInlineStart>,
  paddingLeft?: CSSPropertyValue<paddingLeft>,
  paddingRight?: CSSPropertyValue<paddingRight>,
  paddingTop?: CSSPropertyValue<paddingTop>,
  paddingH?: CSSPropertyValue<number | string>,
  paddingV?: CSSPropertyValue<number | string>,
  marginH?: CSSPropertyValue<number | string>,
  marginV?: CSSPropertyValue<number | string>,
  pageBreakAfter?: CSSPropertyValue<pageBreakAfter>,
  pageBreakBefore?: CSSPropertyValue<pageBreakBefore>,
  pageBreakInside?: CSSPropertyValue<pageBreakInside>,
  perspective?: CSSPropertyValue<perspective>,
  perspectiveOrigin?: CSSPropertyValue<perspectiveOrigin>,
  pointerEvents?: CSSPropertyValue<pointerEvents>,
  position?: CSSPropertyValue<position>,
  quotes?: CSSPropertyValue<quotes>,
  resize?: CSSPropertyValue<resize>,
  right?: CSSPropertyValue<number | string>,
  rubyAlign?: CSSPropertyValue<rubyAlign>,
  rubyMerge?: CSSPropertyValue<rubyMerge>,
  rubyPosition?: CSSPropertyValue<rubyPosition>,
  scrollBehavior?: CSSPropertyValue<scrollBehavior>,
  scrollSnapCoordinate?: CSSPropertyValue<scrollSnapCoordinate>,
  scrollSnapDestination?: CSSPropertyValue<scrollSnapDestination>,
  scrollSnapPointsX?: CSSPropertyValue<scrollSnapPointsX>,
  scrollSnapPointsY?: CSSPropertyValue<scrollSnapPointsY>,
  scrollSnapType?: CSSPropertyValue<scrollSnapType>,
  scrollSnapTypeX?: CSSPropertyValue<scrollSnapTypeX>,
  scrollSnapTypeY?: CSSPropertyValue<scrollSnapTypeY>,
  shapeImageThreshold?: CSSPropertyValue<shapeImageThreshold>,
  shapeMargin?: CSSPropertyValue<shapeMargin>,
  shapeOutside?: CSSPropertyValue<shapeOutside>,
  tabSize?: CSSPropertyValue<tabSize>,
  tableLayout?: CSSPropertyValue<tableLayout>,
  textAlign?: CSSPropertyValue<textAlign>,
  textAlignLast?: CSSPropertyValue<textAlignLast>,
  textCombineUpright?: CSSPropertyValue<textCombineUpright>,
  textDecoration?: CSSPropertyValue<textDecoration>,
  textDecorationColor?: CSSPropertyValue<textDecorationColor>,
  textDecorationLine?: CSSPropertyValue<textDecorationLine>,
  textDecorationSkip?: CSSPropertyValue<textDecorationSkip>,
  textDecorationStyle?: CSSPropertyValue<textDecorationStyle>,
  textEmphasis?: CSSPropertyValue<textEmphasis>,
  textEmphasisColor?: CSSPropertyValue<textEmphasisColor>,
  textEmphasisPosition?: CSSPropertyValue<textEmphasisPosition>,
  textEmphasisStyle?: CSSPropertyValue<textEmphasisStyle>,
  textIndent?: CSSPropertyValue<textIndent>,
  textOrientation?: CSSPropertyValue<textOrientation>,
  textOverflow?: CSSPropertyValue<textOverflow>,
  textRendering?: CSSPropertyValue<textRendering>,
  textShadow?: CSSPropertyValue<textShadow>,
  textSizeAdjust?: CSSPropertyValue<textSizeAdjust>,
  textTransform?: CSSPropertyValue<textTransform>,
  textUnderlinePosition?: CSSPropertyValue<textUnderlinePosition>,
  top?: CSSPropertyValue<number | string>,
  touchAction?: CSSPropertyValue<touchAction>,
  transform?: CSSPropertyValue<transform>,
  transformBox?: CSSPropertyValue<transformBox>,
  transformOrigin?: CSSPropertyValue<transformOrigin>,
  transformStyle?: CSSPropertyValue<transformStyle>,
  transition?: CSSPropertyValue<transition>,
  transitionDelay?: CSSPropertyValue<transitionDelay>,
  transitionDuration?: CSSPropertyValue<transitionDuration>,
  transitionProperty?: CSSPropertyValue<transitionProperty>,
  transitionTimingFunction?: CSSPropertyValue<transitionTimingFunction>,
  unicodeBidi?: CSSPropertyValue<unicodeBidi>,
  userSelect?: CSSPropertyValue<userSelect>,
  verticalAlign?: CSSPropertyValue<verticalAlign>,
  visibility?: CSSPropertyValue<visibility>,
  whiteSpace?: CSSPropertyValue<whiteSpace>,
  widows?: CSSPropertyValue<widows>,
  width?: CSSPropertyValue<number | string>,
  willChange?: CSSPropertyValue<willChange>,
  wordBreak?: CSSPropertyValue<wordBreak>,
  wordSpacing?: CSSPropertyValue<wordSpacing>,
  wordWrap?: CSSPropertyValue<wordWrap>,
  writingMode?: CSSPropertyValue<writingMode>,
  zIndex?: CSSPropertyValue<zIndex>,
  alignmentBaseline?: CSSPropertyValue<alignmentBaseline>,
  baselineShift?: CSSPropertyValue<baselineShift>,
  behavior?: CSSPropertyValue<behavior>,
  clipRule?: CSSPropertyValue<clipRule>,
  cue?: CSSPropertyValue<cue>,
  cueAfter?: CSSPropertyValue<cueAfter>,
  cueBefore?: CSSPropertyValue<cueBefore>,
  dominantBaseline?: CSSPropertyValue<dominantBaseline>,
  fill?: CSSPropertyValue<fill>,
  fillOpacity?: CSSPropertyValue<fillOpacity>,
  fillRule?: CSSPropertyValue<fillRule>,
  glyphOrientationHorizontal?: CSSPropertyValue<glyphOrientationHorizontal>,
  glyphOrientationVertical?: CSSPropertyValue<glyphOrientationVertical>,
  kerning?: CSSPropertyValue<kerning>,
  marker?: CSSPropertyValue<marker>,
  markerEnd?: CSSPropertyValue<markerEnd>,
  markerMid?: CSSPropertyValue<markerMid>,
  markerStart?: CSSPropertyValue<markerStart>,
  pause?: CSSPropertyValue<pause>,
  pauseAfter?: CSSPropertyValue<pauseAfter>,
  pauseBefore?: CSSPropertyValue<pauseBefore>,
  rest?: CSSPropertyValue<rest>,
  restAfter?: CSSPropertyValue<restAfter>,
  restBefore?: CSSPropertyValue<restBefore>,
  shapeRendering?: CSSPropertyValue<shapeRendering>,
  src?: CSSPropertyValue<src>,
  speak?: CSSPropertyValue<speak>,
  speakAs?: CSSPropertyValue<speakAs>,
  stroke?: CSSPropertyValue<stroke>,
  strokeDasharray?: CSSPropertyValue<strokeDasharray>,
  strokeDashoffset?: CSSPropertyValue<strokeDashoffset>,
  strokeLinecap?: CSSPropertyValue<strokeLinecap>,
  strokeLinejoin?: CSSPropertyValue<strokeLinejoin>,
  strokeMiterlimit?: CSSPropertyValue<strokeMiterlimit>,
  strokeOpacity?: CSSPropertyValue<strokeOpacity>,
  strokeWidth?: CSSPropertyValue<strokeWidth>,
  textAnchor?: CSSPropertyValue<textAnchor>,
  unicodeRange?: CSSPropertyValue<unicodeRange>,
  voiceBalance?: CSSPropertyValue<voiceBalance>,
  voiceDuration?: CSSPropertyValue<voiceDuration>,
  voiceFamily?: CSSPropertyValue<voiceFamily>,
  voicePitch?: CSSPropertyValue<voicePitch>,
  voiceRange?: CSSPropertyValue<voiceRange>,
  voiceRate?: CSSPropertyValue<voiceRate>,
  voiceStress?: CSSPropertyValue<voiceStress>,
  voiceVolume?: CSSPropertyValue<voiceVolume>,
  zoom?: CSSPropertyValue<zoom>,
|};
