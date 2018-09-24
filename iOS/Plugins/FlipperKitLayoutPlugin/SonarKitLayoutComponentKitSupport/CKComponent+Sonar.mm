/*
 *  Copyright (c) 2004-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "CKComponent+Sonar.h"

#import <ComponentKit/CKComponentAccessibility.h>
#import <ComponentKit/CKComponentController.h>
#import <ComponentKit/CKComponentInternal.h>
#import <ComponentKit/CKComponentSubclass.h>
#import <ComponentKit/CKComponentViewConfiguration.h>
#import <FlipperKitLayoutPlugin/SKNamed.h>
#import <FlipperKitLayoutPlugin/SKObject.h>

#import "CKStatelessComponent+Sonar.h"

/** This protocol isn't actually adopted anywhere, it just lets us use the SEL below */
@protocol SonarKitLayoutComponentKitOverrideInformalProtocol
- (NSString *)sonar_componentNameOverride;
- (NSString *)sonar_componentDecorationOverride;
- (NSArray<SKNamed<NSDictionary<NSString *, NSObject *> *> *> *)sonar_additionalDataOverride;
@end

static BOOL AccessibilityContextIsDefault(CKComponentAccessibilityContext accessibilityContext) {
  return accessibilityContext == CKComponentAccessibilityContext();
}

static NSDictionary<NSString *, NSObject *> *AccessibilityContextDict(CKComponentAccessibilityContext accessibilityContext) {
  NSMutableDictionary<NSString *, NSObject *> *accessibilityDict = [NSMutableDictionary new];
  if (accessibilityContext.isAccessibilityElement != nil) {
    accessibilityDict[@"isAccessibilityElement"] = SKObject(@([accessibilityContext.isAccessibilityElement boolValue]));
  }
  if (accessibilityContext.accessibilityLabel.hasText()) {
    accessibilityDict[@"accessibilityLabel"] = SKObject(accessibilityContext.accessibilityLabel.value());
  }
  if (accessibilityContext.accessibilityHint.hasText()) {
    accessibilityDict[@"accessibilityHint"] = SKObject(accessibilityContext.accessibilityHint.value());
  }
  if (accessibilityContext.accessibilityValue.hasText()) {
    accessibilityDict[@"accessibilityValue"] = SKObject(accessibilityContext.accessibilityValue.value());
  }
  if (accessibilityContext.accessibilityTraits != nil) {
    accessibilityDict[@"accessibilityTraits"] = SKObject(@([accessibilityContext.accessibilityTraits integerValue]));
  }
  if (accessibilityContext.accessibilityComponentAction) {
    accessibilityDict[@"accessibilityComponentAction.identifier"] = SKObject(@(accessibilityContext.accessibilityComponentAction.identifier().c_str()));
  }
  return accessibilityDict;
}

FB_LINKABLE(CKComponent_Sonar)
@implementation CKComponent (Sonar)

- (NSString *)sonar_getName
{
  if ([self respondsToSelector:@selector(sonar_componentNameOverride)]) {
    return [(id)self sonar_componentNameOverride];
  }
  return NSStringFromClass([self class]);
}

- (NSString *)sonar_getDecoration
{
  if ([self respondsToSelector:@selector(sonar_componentDecorationOverride)]) {
    return [(id)self sonar_componentDecorationOverride];
  }
  return @"componentkit";
}

- (NSArray<SKNamed<NSDictionary<NSString *, NSObject *> *> *> *)sonar_getData
{
  static NSDictionary<NSNumber *, NSString *> *UIControlEventsEnumMap = @{
                                                                          @(UIControlEventTouchDown): @"UIControlEventTouchDown",
                                                                          @(UIControlEventTouchDownRepeat): @"UIControlEventTouchDownRepeat",
                                                                          @(UIControlEventTouchDragInside): @"UIControlEventTouchDragInside",
                                                                          @(UIControlEventTouchDragOutside): @"UIControlEventTouchDragOutside",
                                                                          @(UIControlEventTouchDragEnter): @"UIControlEventTouchDragEnter",
                                                                          @(UIControlEventTouchDragExit): @"UIControlEventTouchDragExit",
                                                                          @(UIControlEventTouchUpInside): @"UIControlEventTouchUpInside",
                                                                          @(UIControlEventTouchUpOutside): @"UIControlEventTouchUpOutside",
                                                                          @(UIControlEventTouchCancel): @"UIControlEventTouchTouchCancel",

                                                                          @(UIControlEventValueChanged): @"UIControlEventValueChanged",
                                                                          @(UIControlEventPrimaryActionTriggered): @"UIControlEventPrimaryActionTriggered",

                                                                          @(UIControlEventEditingDidBegin): @"UIControlEventEditingDidBegin",
                                                                          @(UIControlEventEditingChanged): @"UIControlEventEditingChanged",
                                                                          @(UIControlEventEditingDidEnd): @"UIControlEventEditingDidEnd",
                                                                          @(UIControlEventEditingDidEndOnExit): @"UIControlEventEditingDidEndOnExit",
                                                                          };


  NSMutableArray<SKNamed<NSDictionary<NSString *, NSObject *> *> *> *data = [NSMutableArray new];

  [data addObject: [SKNamed newWithName: @"CKComponent"
                                         withValue: @{
                                                      @"frame": SKObject(self.viewContext.frame),
                                                      @"controller": SKObject(NSStringFromClass([self.controller class])),
                                                      }]];

  if (self.viewContext.view) {
    auto _actions = _CKComponentDebugControlActionsForComponent(self);
    if (_actions.size() > 0) {
      NSMutableDictionary<NSString *, NSObject *> *actions = [NSMutableDictionary new];

      for (NSNumber *controlEvent : [UIControlEventsEnumMap allKeys]) {
        NSMutableArray<NSDictionary<NSString *, NSObject *> *> *responders = [NSMutableArray new];

        for (const auto action : _actions) {
          if ((action.first & [controlEvent integerValue]) == 0) {
            continue;
          }

          for (auto responder : action.second) {
            auto debugTarget = _CKTypedComponentDebugInitialTarget(responder);
            if (debugTarget.isBlockBaseAction()) {
              [responders addObject: @{
                                       @"identifier": SKObject(@(responder.identifier().c_str())),
                                       @"selector": SKObject(NSStringFromSelector(responder.selector())),
                                       }];

            } else {
              id initialTarget = debugTarget.get(self);
              const CKActionInfo actionInfo = CKActionFind(responder.selector(), initialTarget);
              [responders addObject: @{
                                       @"initialTarget": SKObject(NSStringFromClass([initialTarget class])),
                                       @"identifier": SKObject(@(responder.identifier().c_str())),
                                       @"handler": SKObject(NSStringFromClass([actionInfo.responder class])),
                                       @"selector": SKObject(NSStringFromSelector(responder.selector())),
                                       }];
            }
          }
        }

        if (responders.count > 0) {
          actions[UIControlEventsEnumMap[controlEvent]] = responders;
        }
      }

      [data addObject: [SKNamed newWithName: @"Actions" withValue: actions]];
    }
  }

  // Only add accessibility panel if accessibilityContext is not default
  CKComponentAccessibilityContext accessibilityContext = [self viewConfiguration].accessibilityContext();
  if (!AccessibilityContextIsDefault(accessibilityContext)) {
    [data addObject:
     [SKNamed newWithName: @"Accessibility"
                withValue: @{
                             @"accessibilityContext": AccessibilityContextDict(accessibilityContext),
                             @"accessibilityEnabled": SKMutableObject(@(CK::Component::Accessibility::IsAccessibilityEnabled())),
                             }]];
  }

  if ([self respondsToSelector:@selector(sonar_additionalDataOverride)]) {
    [data addObjectsFromArray:[(id)self sonar_additionalDataOverride]];
  }

  return data;
}

- (NSDictionary<NSString *, SKNodeUpdateData> *)sonar_getDataMutations {
  return @{
           @"CKComponentAccessibility.accessibilityEnabled": ^(NSNumber *value) {
             CK::Component::Accessibility::SetForceAccessibilityEnabled([value boolValue]);
           }
           };
}

@end

#endif
