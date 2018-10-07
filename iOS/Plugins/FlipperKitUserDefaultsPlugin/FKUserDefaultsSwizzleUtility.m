//
//  FKUserDefaultsSwizzleUtility.m
//  FlipperKit
//
//  Created by Marc Terns on 10/6/18.
//

#import "FKUserDefaultsSwizzleUtility.h"
#import <objc/runtime.h>

static NSMutableSet *swizzledClasses;
static NSMutableDictionary *swizzledBlocks;
static IMP forwardingIMP;
static dispatch_once_t once;

@implementation FKUserDefaultsSwizzleUtility

+ (void)swizzleSelector:(SEL)selector class:(Class)aClass block:(void (^)(NSInvocation * _Nonnull))block {
    dispatch_once(&once, ^{
        swizzledClasses = [NSMutableSet set];
        swizzledBlocks = [NSMutableDictionary dictionary];
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wundeclared-selector"
        forwardingIMP = class_getMethodImplementation([NSObject class], @selector(flipperKitThisMethodShouldNotExist));
#pragma clang diagnostic pop
    });
    if (![swizzledClasses containsObject:aClass]) {
        SEL fwdSel = @selector(forwardInvocation:);
        Method m = class_getInstanceMethod(aClass, fwdSel);
        __block IMP orig;
        
        IMP imp = imp_implementationWithBlock(^(id self, NSInvocation *invocation) {
            NSString * selStr = NSStringFromSelector([invocation selector]);
            void (^block)(NSInvocation *) = swizzledBlocks[aClass][selStr];
            if (block != nil) {
                NSString *originalStr = [@"comfacebookFlipperKit_" stringByAppendingString:selStr];
                [invocation setSelector:NSSelectorFromString(originalStr)];
                block(invocation);
            } else {
                ((void (*)(id, SEL, NSInvocation *))orig)(self, fwdSel, invocation);
            }
        });
        orig = method_setImplementation(m, imp);
        [swizzledClasses addObject:aClass];
    }
    NSMutableDictionary *classDict = swizzledBlocks[aClass];
    if (classDict == nil) {
        classDict = [NSMutableDictionary dictionary];
        swizzledBlocks[(id)aClass] = classDict;
    }
    classDict[NSStringFromSelector(selector)] = block;
    Method m = class_getInstanceMethod(aClass, selector);
    NSString *newSelStr = [@"comfacebookFlipperKit_" stringByAppendingString:NSStringFromSelector(selector)];
    SEL newSel = NSSelectorFromString(newSelStr);
    class_addMethod(aClass, newSel, method_getImplementation(m), method_getTypeEncoding(m));
    method_setImplementation(m, forwardingIMP);
}

@end
