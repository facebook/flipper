@REM Copyright (c) Meta Platforms, Inc. and affiliates.
@REM
@REM This source code is licensed under the MIT license found in the
@REM LICENSE file in the root directory of this source tree.

@echo off

set TS_NODE_TRANSPILE_ONLY=true TS_NODE_PROJECT=scripts/tsconfig.json & node --max_old_space_size=4096 --require ts-node/register %*
