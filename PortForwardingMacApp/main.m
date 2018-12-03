// Copyright 2004-present Facebook. All Rights Reserved.

#import <Foundation/Foundation.h>

#import <FKPortForwarding/FKPortForwardingClient.h>

static const char kPortForwardParamPrefix[] = "-portForward=";
static const char kMultiplexChannelPortParamPrefix[] = "-multiplexChannelPort=";

static BOOL prefix(const char *pre, const char *str) {
    return strncmp(pre, str, strlen(pre)) == 0;
}

int main(int argc, char *argv[])
{
  long connectionsPort = 8081;
  long multiplexPort = 8025;

  for (int i = 1; i < argc; ++i) {
    if (prefix(kPortForwardParamPrefix, argv[i])) {
      connectionsPort = strtol(argv[i] + strlen(kPortForwardParamPrefix), NULL, 10);
    } else if (prefix(kMultiplexChannelPortParamPrefix, argv[i])) {
      multiplexPort = strtol(argv[i] + strlen(kMultiplexChannelPortParamPrefix), NULL, 10);
    }
  }

  FKPortForwardingClient *client = [FKPortForwardingClient new];
  [client forwardConnectionsToPort:connectionsPort];
  [client connectToMultiplexingChannelOnPort:multiplexPort];

  [[NSRunLoop currentRunLoop] run];
  client = nil;
  return 0;
}
