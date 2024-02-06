/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUILabelDescriptor.h"
#import "UIDInspectable.h"
#import "UIDMetadata.h"
#import "UIDMetadataRegister.h"

@interface UIDUILabelDescriptor () {
  UIDMetadataId UILabelAttributeId;
  UIDMetadataId TextAttributeId;
  UIDMetadataId AttributedTextAttributeId;
  UIDMetadataId FontAttributeId;
  UIDMetadataId TextColorAttributeId;
  UIDMetadataId TextAlignmentAttributeId;
  UIDMetadataId LineBreakModeAttributeId;
  UIDMetadataId LineBreakStrategyAttributeId;
  UIDMetadataId EnabledAttributeId;
  UIDMetadataId ShowExpansionTextAttributeId;
  UIDMetadataId AdjustsFontSizeToFitWidthAttributeId;
  UIDMetadataId AllowsDefaultTightneningForTruncationAttributeId;
  UIDMetadataId BaselineAdjustmentAttributeId;
  UIDMetadataId MinScaleFactorAttributeId;
  UIDMetadataId NumberOfLinesAttributeId;
  UIDMetadataId HighlightedTextColorAttributeId;
  UIDMetadataId HighlightedAttributeId;
  UIDMetadataId ShadowColorAttributeId;
  UIDMetadataId ShadowOffsetAttributeId;

  NSDictionary* NSTextAlignmentEnum;
  NSDictionary* NSLineBreakModeEnum;
  NSDictionary* NSLineBreakStrategyEnum;
  NSDictionary* UIBaselineAdjustmentEnum;
}

@end

@implementation UIDUILabelDescriptor

- (instancetype)init {
  self = [super init];
  if (self) {
    NSTextAlignmentEnum = @{
      @(NSTextAlignmentLeft) : @"LEFT",
      @(NSTextAlignmentRight) : @"RIGHT",
      @(NSTextAlignmentCenter) : @"CENTER",
      @(NSTextAlignmentJustified) : @"JUSTIFIED",
      @(NSTextAlignmentNatural) : @"NATURAL",
    };
    NSLineBreakModeEnum = @{
      @(NSLineBreakByWordWrapping) : @"WORD WRAPPING",
      @(NSLineBreakByCharWrapping) : @"CHAR WRAPPING",
      @(NSLineBreakByClipping) : @"CLIPPING",
      @(NSLineBreakByTruncatingHead) : @"TRUNCATING HEAD",
      @(NSLineBreakByTruncatingTail) : @"TRUNCATING TAIL",
      @(NSLineBreakByTruncatingMiddle) : @"TRUNCATING MIDDLE",
    };
    if (@available(iOS 14.0, *)) {
      NSLineBreakStrategyEnum = @{
        @(NSLineBreakStrategyNone) : @"NONE",
        @(NSLineBreakStrategyPushOut) : @"PUSH OUT",
        @(NSLineBreakStrategyHangulWordPriority) : @"HANGUL WORD PRIORITY",
        @(NSLineBreakStrategyStandard) : @"STANDARD",
      };
    } else {
      NSLineBreakStrategyEnum = @{
        @(NSLineBreakStrategyNone) : @"NONE",
        @(NSLineBreakStrategyPushOut) : @"PUSH OUT",
      };
    }
    UIBaselineAdjustmentEnum = @{
      @(UIBaselineAdjustmentAlignBaselines) : @"ALIGN BASELINES",
      @(UIBaselineAdjustmentAlignCenters) : @"ALIGN CENTERS",
      @(UIBaselineAdjustmentNone) : @"NONE",
    };

    UILabelAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"UILabel"];
    TextAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"text"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    AttributedTextAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"attributedText"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    FontAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"font"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    TextColorAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"textColor"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    TextAlignmentAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"textAlignment"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    LineBreakModeAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"lineBreakMode"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    LineBreakStrategyAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"lineBreakStrategy"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    EnabledAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"enabled"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    if (@available(iOS 15.0, macCatalyst 15.0, *)) {
      ShowExpansionTextAttributeId = [[UIDMetadataRegister shared]
          registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                              name:@"showsExpansionTextWhenTruncated"
                         isMutable:false
                         definedBy:UILabelAttributeId];
    }
    AdjustsFontSizeToFitWidthAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"adjustsFontSizeToFitWidth"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    AllowsDefaultTightneningForTruncationAttributeId =
        [[UIDMetadataRegister shared]
            registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                                name:@"allowsDefaultTighteningForTruncation"
                           isMutable:false
                           definedBy:UILabelAttributeId];
    BaselineAdjustmentAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"baselineAdjustment"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    MinScaleFactorAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"minimumScaleFactor"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    NumberOfLinesAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"numberOfLines"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    HighlightedTextColorAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"highlightedTextColor"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    HighlightedAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"highligted"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    ShadowColorAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"shadowColor"
                       isMutable:false
                       definedBy:UILabelAttributeId];
    ShadowOffsetAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"shadowOffset"
                       isMutable:false
                       definedBy:UILabelAttributeId];
  }
  return self;
}

- (void)aggregateAttributes:(UIDMutableAttributes*)attributes
                    forNode:(UILabel*)node {
  NSMutableDictionary* labelAttributes = [NSMutableDictionary new];

/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
  [labelAttributes setObject:[UIDInspectableText fromText:node.text]
#pragma clang diagnostic pop
                      forKey:TextAttributeId];
  [labelAttributes
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
      setObject:[UIDInspectableText fromText:[node.attributedText string]]
#pragma clang diagnostic pop
         forKey:AttributedTextAttributeId];
  [labelAttributes setObject:[UIDInspectableText fromText:node.font.fontName]
                      forKey:FontAttributeId];
  [labelAttributes setObject:[UIDInspectableColor fromColor:node.textColor]
                      forKey:TextColorAttributeId];
  [labelAttributes
      setObject:[UIDInspectableEnum
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
                    from:NSTextAlignmentEnum[@(node.textAlignment)]]
#pragma clang diagnostic pop
         forKey:TextAlignmentAttributeId];
  [labelAttributes
      setObject:[UIDInspectableEnum
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
                    from:NSLineBreakModeEnum[@(node.lineBreakMode)]]
#pragma clang diagnostic pop
         forKey:LineBreakModeAttributeId];
  [labelAttributes setObject:[UIDInspectableBoolean fromBoolean:node.enabled]
                      forKey:EnabledAttributeId];
  if (@available(iOS 15.0, macCatalyst 15.0, *)) {
    [labelAttributes
        setObject:[UIDInspectableBoolean
                      fromBoolean:node.showsExpansionTextWhenTruncated]
           forKey:ShowExpansionTextAttributeId];
  }

  [labelAttributes setObject:[UIDInspectableBoolean
                                 fromBoolean:node.adjustsFontSizeToFitWidth]
                      forKey:AdjustsFontSizeToFitWidthAttributeId];
  [labelAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:node.allowsDefaultTighteningForTruncation]
         forKey:AllowsDefaultTightneningForTruncationAttributeId];
  [labelAttributes
      setObject:[UIDInspectableEnum
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
                    from:UIBaselineAdjustmentEnum[@(node.baselineAdjustment)]]
#pragma clang diagnostic pop
         forKey:BaselineAdjustmentAttributeId];
  [labelAttributes
      setObject:[UIDInspectableNumber fromCGFloat:node.minimumScaleFactor]
         forKey:MinScaleFactorAttributeId];
  [labelAttributes
      setObject:[UIDInspectableNumber
                    fromNumber:[NSNumber numberWithInt:node.numberOfLines]]
         forKey:NumberOfLinesAttributeId];
  [labelAttributes
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
      setObject:[UIDInspectableColor fromColor:node.highlightedTextColor]
#pragma clang diagnostic pop
         forKey:HighlightedTextColorAttributeId];
  [labelAttributes
      setObject:[UIDInspectableBoolean fromBoolean:node.highlighted]
         forKey:HighlightedAttributeId];
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
  [labelAttributes setObject:[UIDInspectableColor fromColor:node.shadowColor]
#pragma clang diagnostic pop
                      forKey:ShadowColorAttributeId];
  [labelAttributes setObject:[UIDInspectableSize fromSize:node.shadowOffset]
                      forKey:ShadowOffsetAttributeId];

  [attributes setObject:[UIDInspectableObject fromFields:labelAttributes]
                 forKey:UILabelAttributeId];
}

@end

#endif
