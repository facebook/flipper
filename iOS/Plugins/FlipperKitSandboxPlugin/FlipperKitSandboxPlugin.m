//
//  FlipperKitSandboxPlugin.m
//  Created by 段清伦 on 2020/6/27.
//  Copyright © 2020 段清伦. All rights reserved.
//

#if FB_SONARKIT_ENABLED

#import "FlipperKitSandboxPlugin.h"

#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>

@implementation FlipperKitSandboxPlugin

- (NSString *)identifier
{
	return @"Sandbox";
}

- (void)didConnect:(id <FlipperConnection>)connection
{

}

- (void)didDisconnect
{

}

@end

#endif
