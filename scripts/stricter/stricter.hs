#!/usr/bin/env stack
-- stack --resolver lts-14.3 --install-ghc runghc --package turtle --package system-filepath --package foldl --package typed-process --package bytestring
{-
Copyright (c) Facebook, Inc. and its affiliates.

This source code is licensed under the MIT license found in the LICENSE file
in the root directory of this source tree.
-}

{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE KindSignatures #-}
{-# LANGUAGE FlexibleContexts #-}

import Prelude hiding (FilePath)
import Turtle

import Data.Maybe (catMaybes)
import Control.Monad (forM_)
import Data.List ((\\))

import qualified Filesystem.Path.CurrentOS as Path
import qualified System.Process.Typed as Proc
import qualified Data.Text as T
import qualified Control.Foldl as F
import qualified Data.ByteString.Char8 as C
import qualified Data.ByteString as BS
import qualified Data.ByteString.Lazy as BSL

-- * Global settings

flipperPath :: FilePath -> FilePath
flipperPath basePath =
  basePath </> "xplat" </> "sonar"

-- * Application logic

-- | Find the root of the project, indicated by the presence of a ".hg" folder.
findProjectRoot :: FilePath -> IO (Maybe FilePath)
findProjectRoot dir = go $ Path.splitDirectories dir
  where
        go :: forall (m :: * -> *).
              MonadIO m =>
              [FilePath] -> m (Maybe FilePath)
        go []     = return Nothing
        go ds     = do
          let ds'  = init ds
              dir' = Path.concat ds'
              hg   = dir' </> ".hg"
          hgExists <- testdir hg
          if hgExists then
            return $ Just dir'
          else
            go ds'

data TSCResult = TSCResult
  { numErrors :: Int
  , errors    :: [BS.ByteString]
  } deriving (Show, Eq)

runTSC :: FilePath -> Shell TSCResult
runTSC root = do
  cd root
  (exitCode, stdout, stderr) <- liftIO $ Proc.readProcess (Proc.proc "yarn" ["run", "tsc", "--strict"])
  let errors = C.split '\n' (BSL.toStrict stdout) & filter (BS.isInfixOf ": error TS")
  pure $ TSCResult { numErrors = length errors
                   , errors = errors
                   }

hgPrev :: Shell ()
hgPrev = procs "hg" ["prev"] mempty

hgNext :: Shell ()
hgNext = procs "hg" ["next"] mempty

handleErr :: IO ExitCode
handleErr = err "Failed to run hg/tsc. Check above output." >> (pure $ ExitFailure 2)

handleRes :: TSCResult -> TSCResult -> IO ExitCode
handleRes cur prev = do
  let delta = numErrors cur - numErrors prev
  if delta > 0 then do
    eprintf ("TSC Strict Mode regression. "%d%" new violations introduced:\n") delta
    forM_ (errors cur \\ errors prev) $ eprintf ("- "%w%"\n")
    eprintf "Please visit https://fburl.com/strictflipper for more information.\n"
    return $ ExitFailure 1
  else do
    printf ("TSC Strict Mode test passed. Delta: "%d%"\n") delta
    return ExitSuccess

main :: IO ()
main = do
  projectRoot <- findProjectRoot =<< pwd
  let flipperDir = flipperPath <$> projectRoot
  flipperDir_ <- case flipperDir of
        Just f -> realpath f
        Nothing -> die "Couldn't determine Flipper project location."

  printf "Running tsc --strict against current revision.\n"
  currentRes <- fold (runTSC flipperDir_) F.head
  printf "Checking out hg prev.\n"
  _ <- sh hgPrev
  printf "Running tsc --strict against previous revision.\n"
  prevRes <- fold (runTSC flipperDir_) F.head
  printf "Checking out hg next.\n"
  _ <- sh hgNext

  exit =<< case (currentRes, prevRes) of
    (Just cur, Just prev) -> handleRes cur prev
    _ -> handleErr