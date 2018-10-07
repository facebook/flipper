//
//  FKUserDefaultsPlugin.m
//  Sample
//
//  Created by Marc Terns on 9/30/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#import "FKUserDefaultsPlugin.h"
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>

@interface FKUserDefaultsPlugin ()
@property (nonatomic, strong) id<FlipperConnection> flipperConnection;
@property (nonatomic, strong) NSUserDefaults *userDefaults;
@property (nonatomic, copy) NSString *key;
@property (nonatomic, copy) NSString *suiteName;
@end

@implementation FKUserDefaultsPlugin

- (instancetype)initWithSuiteName:(NSString *)suiteName {
    if (self = [super init]) {
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(userDefaultsDidChange:) name:NSUserDefaultsDidChangeNotification object:nil];
        _userDefaults = [NSUserDefaults standardUserDefaults];
        _suiteName = suiteName;
    }
    return self;
        
}

- (void)didConnect:(id<FlipperConnection>)connection {
    self.flipperConnection = connection;
    [connection receive:@"getSharedPreferences" withBlock:^(NSDictionary *params, id<FlipperResponder> responder) {
        [responder success:[self.userDefaults dictionaryRepresentation]];
    }];
    
    [connection receive:@"setSharedPreference" withBlock:^(NSDictionary *params , id<FlipperResponder> responder) {
        NSString *preferenceName = params[@"preferenceName"];
        [self.userDefaults setObject:params[@"preferenceValue"] forKey:preferenceName];
        [responder success:[self.userDefaults dictionaryRepresentation]];
    }];
}

- (void)didDisconnect {
    self.flipperConnection = nil;
}

- (NSString *)identifier {
    return @"Preferences";
}

- (void)userDefaultsDidChange:(NSNotification *)notification {
    if (!self.flipperConnection) {
        return;
    }
}

@end
