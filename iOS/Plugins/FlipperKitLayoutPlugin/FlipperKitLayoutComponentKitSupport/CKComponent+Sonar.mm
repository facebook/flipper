/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "CKComponent+Sonar.h"

#import <ComponentKit/CKComponentAccessibility.h>
#import <ComponentKit/CKComponentController.h>
#import <ComponentKit/CKComponentDebugController.h>
#import <ComponentKit/CKComponentInternal.h>
#import <ComponentKit/CKComponentSubclass.h>
#import <ComponentKit/CKViewConfiguration.h>
#import <FlipperKitLayoutHelpers/SKNamed.h>
#import <FlipperKitLayoutHelpers/SKObject.h>
#import <RenderCore/CKMutex.h>
#import <objc/message.h>
#import <objc/runtime.h>

#import "CKCenterLayoutComponent+Sonar.h"
#import "CKFlexboxComponent+Sonar.h"
#import "CKInsetComponent+Sonar.h"
#import "CKRatioLayoutComponent+Sonar.h"
#import "CKStatelessComponent+Sonar.h"
#import "FKDataStorageForLiveEditing.h"
#import "Utils.h"

/** This protocol isn't actually adopted anywhere, it just lets us use the SEL
 * below */
@protocol SonarKitLayoutComponentKitOverrideInformalProtocol
- (NSString*)sonar_componentNameOverride;
- (NSString*)sonar_componentDecorationOverride;
- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)
    sonar_additionalDataOverride;
@end

static NSDictionary<NSString*, NSObject*>* AccessibilityContextDict(
    CKComponentAccessibilityContext accessibilityContext) {
  NSMutableDictionary<NSString*, NSObject*>* accessibilityDict =
      [NSMutableDictionary new];
  if (accessibilityContext.isAccessibilityElement != nil) {
    accessibilityDict[@"isAccessibilityElement"] =
        SKObject(@([accessibilityContext.isAccessibilityElement boolValue]));
  }
  if (accessibilityContext.accessibilityLabel.hasText()) {
    accessibilityDict[@"accessibilityLabel"] =
        SKObject(accessibilityContext.accessibilityLabel.value());
  }
  if (accessibilityContext.accessibilityHint.hasText()) {
    accessibilityDict[@"accessibilityHint"] =
        SKObject(accessibilityContext.accessibilityHint.value());
  }
  if (accessibilityContext.accessibilityValue.hasText()) {
    accessibilityDict[@"accessibilityValue"] =
        SKObject(accessibilityContext.accessibilityValue.value());
  }
  if (accessibilityContext.accessibilityTraits != nil) {
    accessibilityDict[@"accessibilityTraits"] =
        SKObject(@([accessibilityContext.accessibilityTraits integerValue]));
  }
  return accessibilityDict;
}

FB_LINKABLE(CKComponent_Sonar)
@implementation CKComponent (Sonar)

static FKDataStorageForLiveEditing* _dataStorage;
static NSMutableSet<NSString*>* _swizzledClasses;
static CK::StaticMutex _mutex = CK_MUTEX_INITIALIZER;

+ (void)swizzleOriginalSEL:(SEL)originalSEL to:(SEL)replacementSEL {
  Class targetClass = self;
  Method original = class_getInstanceMethod(targetClass, originalSEL);
  Method replacement = class_getInstanceMethod(targetClass, replacementSEL);
  BOOL didAddMethod = class_addMethod(
      targetClass,
      originalSEL,
      method_getImplementation(replacement),
      method_getTypeEncoding(replacement));
  if (didAddMethod) {
    class_replaceMethod(
        targetClass,
        replacementSEL,
        method_getImplementation(original),
        method_getTypeEncoding(original));
  } else {
    method_exchangeImplementations(original, replacement);
  }
}

- (NSString*)sonar_getName {
  if ([self respondsToSelector:@selector(sonar_componentNameOverride)]) {
    return [(id)self sonar_componentNameOverride];
  }
  auto const canBeReusedCounter = self.flipper_canBeReusedCounter;
  if (canBeReusedCounter > 0) {
    return [NSString stringWithFormat:@"%@ (Can be reused x%lu)",
                                      self.className,
                                      (unsigned long)canBeReusedCounter];
  }
  return self.className;
}

- (NSString*)sonar_getDecoration {
  if ([self respondsToSelector:@selector(sonar_componentDecorationOverride)]) {
    return [(id)self sonar_componentDecorationOverride];
  }
  return @"componentkit";
}

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)sonar_getData {
  static NSDictionary<NSNumber*, NSString*>* UIControlEventsEnumMap = @{
    @(UIControlEventTouchDown) : @"UIControlEventTouchDown",
    @(UIControlEventTouchDownRepeat) : @"UIControlEventTouchDownRepeat",
    @(UIControlEventTouchDragInside) : @"UIControlEventTouchDragInside",
    @(UIControlEventTouchDragOutside) : @"UIControlEventTouchDragOutside",
    @(UIControlEventTouchDragEnter) : @"UIControlEventTouchDragEnter",
    @(UIControlEventTouchDragExit) : @"UIControlEventTouchDragExit",
    @(UIControlEventTouchUpInside) : @"UIControlEventTouchUpInside",
    @(UIControlEventTouchUpOutside) : @"UIControlEventTouchUpOutside",
    @(UIControlEventTouchCancel) : @"UIControlEventTouchTouchCancel",

    @(UIControlEventValueChanged) : @"UIControlEventValueChanged",
    @(UIControlEventPrimaryActionTriggered) :
        @"UIControlEventPrimaryActionTriggered",

    @(UIControlEventEditingDidBegin) : @"UIControlEventEditingDidBegin",
    @(UIControlEventEditingChanged) : @"UIControlEventEditingChanged",
    @(UIControlEventEditingDidEnd) : @"UIControlEventEditingDidEnd",
    @(UIControlEventEditingDidEndOnExit) : @"UIControlEventEditingDidEndOnExit",
  };

  NSMutableArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>* data =
      [NSMutableArray new];

  [data addObject:[SKNamed newWithName:@"CKComponent"
                             withValue:@{
                               @"frame" : SKObject(self.viewContext.frame),
                               @"controller" : SKObject(
                                   NSStringFromClass([self.controller class])),
                               @"size" : SKObject(ckcomponentSize([self size])),
                             }]];

  auto const canBeReusedCounter = self.flipper_canBeReusedCounter;
  if (canBeReusedCounter > 0) {
    [data addObject:[SKNamed
                        newWithName:@"Convert to CKRenderComponent"
                          withValue:@{
                            @"This component can be reused" : SKObject([NSString
                                stringWithFormat:@"%lu times",
                                                 (unsigned long)
                                                     canBeReusedCounter])
                          }]];
  }

  if (self.viewContext.view) {
    auto _actions = _CKComponentDebugControlActionsForComponent(self);
    if (_actions.size() > 0) {
      NSMutableDictionary<NSString*, NSObject*>* actions =
          [NSMutableDictionary new];

      for (NSNumber* controlEvent : [UIControlEventsEnumMap allKeys]) {
        NSMutableArray<NSDictionary<NSString*, NSObject*>*>* responders =
            [NSMutableArray new];

        for (const auto& action : _actions) {
          if ((action.first & [controlEvent integerValue]) == 0) {
            continue;
          }

          for (auto responder : action.second) {
            auto debugTarget = _CKTypedComponentDebugInitialTarget(responder);
            if (debugTarget.isBlockBaseAction()) {
              [responders addObject:@{
                @"identifier" : SKObject(@(responder.identifier().c_str())),
                @"selector" :
                    SKObject(NSStringFromSelector(responder.selector())),
              }];

            } else {
              id initialTarget = debugTarget.get(self);
              const CKActionInfo actionInfo =
                  CKActionFind(responder.selector(), initialTarget);
              [responders addObject:@{
                @"initialTarget" :
                    SKObject(NSStringFromClass([initialTarget class])),
                @"identifier" : SKObject(@(responder.identifier().c_str())),
                @"handler" :
                    SKObject(NSStringFromClass([actionInfo.responder class])),
                @"selector" :
                    SKObject(NSStringFromSelector(responder.selector())),
              }];
            }
          }
        }

        if (responders.count > 0) {
          actions[UIControlEventsEnumMap[controlEvent]] = responders;
        }
      }

      [data addObject:[SKNamed newWithName:@"Actions" withValue:actions]];
    }
  }

  auto const identitySection = [NSMutableDictionary<NSString*, id> dictionary];
  if (auto const i = self.uniqueIdentifier) {
    identitySection[@"uniqueIdentifier"] = SKObject{i};
  }
  if (auto const node = self.treeNode) {
    if (auto const scopeIdentifier = std::get<2>(node.componentKey)) {
      identitySection[@"scopeIdentifier"] = scopeIdentifier;
    }
  }
  if (identitySection.count > 0) {
    [data addObject:[SKNamed newWithName:@"Identity"
                               withValue:identitySection]];
  }

  // Only add accessibility panel if accessibilityContext is not default
  CKComponentAccessibilityContext accessibilityContext =
      [self viewConfiguration].accessibilityContext();
  NSDictionary* accessibilityDict =
      AccessibilityContextDict(accessibilityContext);
  if ([accessibilityDict count]) {
    [data addObject:[SKNamed newWithName:@"Accessibility"
                               withValue:@{
                                 @"accessibilityContext" : accessibilityDict,
                                 @"accessibilityEnabled" : SKMutableObject(
                                     @(CK::Component::Accessibility::
                                           IsAccessibilityEnabled())),
                               }]];
  }
  if ([self respondsToSelector:@selector(sonar_additionalDataOverride)]) {
    [data addObjectsFromArray:[(id)self sonar_additionalDataOverride]];
  }

  return data;
}

- (void)setMutableData:(id)value {
}

- (void)setMutableDataFromStorage {
  const auto globalID = self.treeNode.nodeIdentifier;
  id data = [_dataStorage dataForTreeNodeIdentifier:globalID];
  if (data) {
    [self setMutableData:data];
  }
}

+ (NSString*)swizzledMethodNameForRender {
  return
      [NSString stringWithFormat:@"sonar_render_%@", NSStringFromClass(self)];
}

+ (SEL)registerNewImplementation:(SEL)selector {
  SEL resultSelector =
      sel_registerName([[self swizzledMethodNameForRender] UTF8String]);
  Method method = class_getInstanceMethod(self, selector);
  class_addMethod(
      self,
      resultSelector,
      method_getImplementation(method),
      method_getTypeEncoding(method));
  return resultSelector;
}

- (CKComponent*)sonar_render:(id)state {
  [self setMutableDataFromStorage];
  SEL resultSelector =
      NSSelectorFromString([[self class] swizzledMethodNameForRender]);
  return ((CKComponent * (*)(CKComponent*, SEL, id)) objc_msgSend)(
      self, resultSelector, state);
}

- (NSDictionary<NSString*, SKNodeDataChanged>*)sonar_getDataMutationsChanged {
  return @{};
}

- (NSDictionary<NSString*, SKNodeUpdateData>*)sonar_getDataMutations {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    _dataStorage = [[FKDataStorageForLiveEditing alloc] init];
    _swizzledClasses = [[NSMutableSet alloc] init];
  });
  {
    CK::StaticMutexLocker l(_mutex);
    if (![_swizzledClasses containsObject:NSStringFromClass([self class])]) {
      [_swizzledClasses addObject:NSStringFromClass([self class])];
      if ([self respondsToSelector:@selector(render:)]) {
        SEL replacement =
            [[self class] registerNewImplementation:@selector(sonar_render:)];
        [[self class] swizzleOriginalSEL:@selector(render:) to:replacement];
      } else {
        CKAssert(
            NO,
            @"Only CKRenderLayoutComponent and CKRenderLayoutWithChildrenComponent children are now able to be live editable");
      }
    }
  }
  NSDictionary<NSString*, SKNodeDataChanged>* dataChanged =
      [self sonar_getDataMutationsChanged];
  NSMutableDictionary* dataMutation = [[NSMutableDictionary alloc] init];
  [dataMutation addEntriesFromDictionary:@{
                                           @"Accessibility.accessibilityEnabled": ^(NSNumber *value) {
    CK::Component::Accessibility::SetForceAccessibilityEnabled([value boolValue]);
}
}
   ];
   const auto globalID = self.treeNode.nodeIdentifier;
   for (NSString* key in dataChanged) {
     const auto block = dataChanged[key];
     [dataMutation
         setObject:^(id value) {
           id data = block(value);
           [_dataStorage setData:data forTreeNodeIdentifier:globalID];
           [CKComponentDebugController
               reflowComponentsWithTreeNodeIdentifier:globalID];
         }
            forKey:key];
   }
   return dataMutation;
   }

   static char const kCanBeReusedKey = ' ';

   - (void)setFlipper_canBeReusedCounter:(NSUInteger)canBeReusedCounter {
     objc_setAssociatedObject(
         self,
         &kCanBeReusedKey,
         @(canBeReusedCounter),
         OBJC_ASSOCIATION_RETAIN_NONATOMIC);
   }

   - (NSUInteger)flipper_canBeReusedCounter {
     return [objc_getAssociatedObject(self, &kCanBeReusedKey)
         unsignedIntegerValue];
   }

   @end

#endif
