//
//  FKUserDefaultsSwizzleUtility.h
//  FlipperKit
//
//  Created by Marc Terns on 10/6/18.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface FKUserDefaultsSwizzleUtility : NSObject

+ (void)swizzleSelector:(SEL)selector class:(Class)aClass block:(void(^)(NSInvocation *invocation))block;

@end

NS_ASSUME_NONNULL_END
