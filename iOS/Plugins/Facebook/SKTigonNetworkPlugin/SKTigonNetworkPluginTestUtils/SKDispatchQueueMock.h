// Copyright 2004-present Facebook. All Rights Reserved.

#if FB_SONARKIT_ENABLED

#pragma once

#import <SonarKitNetworkPlugin/SKDispatchQueue.h>

#import <vector>

namespace facebook {
  namespace sonar {
    class SyncQueue: public DispatchQueue
    {
      public:
      SyncQueue()
      :_isSuspended(NO){}

      void async(dispatch_block_t block) override
      {
        if (_isSuspended) {
          _blockArray.push_back(block);
        } else {
          block();
        }
      }

      void suspend()
      {
        _isSuspended = YES;
      }

      void resume()
      {
        _isSuspended = NO;
        for (const auto &block : _blockArray) {
          block();
        }
      }

    private:
      std::vector<dispatch_block_t> _blockArray;
      bool _isSuspended;
    };
  }
}

#endif
