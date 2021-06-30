#!/usr/bin/env stack
-- stack --resolver lts-14.7 --install-ghc runghc --package turtle --package system-filepath --package foldl
{-
Copyright (c) Facebook, Inc. and its affiliates.

This source code is licensed under the MIT license found in the LICENSE file
in the root directory of this source tree.
-}

{-# OPTIONS_GHC -fno-warn-name-shadowing #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE KindSignatures #-}
{-# LANGUAGE FlexibleContexts #-}

import Prelude hiding (FilePath)
import Turtle

import Data.Maybe (catMaybes)
import Control.Monad (forM_)

import qualified Filesystem.Path.CurrentOS as Path
import qualified Data.Text as T
import qualified Control.Foldl as F

-- * Global settings

releaseReplacements :: [(FilePath, Pattern Version)]
releaseReplacements =
  [("gradle.properties", "VERSION_NAME=" *> anyVersion)
  ,("docs/getting-started/android-native.mdx", spaces >> "debugImplementation 'com.facebook.flipper:flipper:" *> releaseVersion <* "'")
  ,("docs/getting-started/android-native.mdx", spaces >> "releaseImplementation 'com.facebook.flipper:flipper-noop:" *> releaseVersion <* "'")
  ,("docs/getting-started/react-native-android.mdx", spaces >> "debugImplementation 'com.facebook.flipper:flipper:" *> releaseVersion <* "'")
  ,("docs/getting-started/react-native-android.mdx", spaces >> "debugImplementation 'com.facebook.flipper:flipper-network-plugin:" *> releaseVersion <* "'")
  ,("desktop/plugins/public/leak_canary/docs/setup.mdx", spaces >> "debugImplementation 'com.facebook.flipper:flipper-leakcanary2-plugin:" *> releaseVersion <* "'")
  ,("desktop/plugins/public/layout/docs/setup.mdx", spaces >> "debugImplementation 'com.facebook.flipper:flipper-litho-plugin:" *> releaseVersion <* "'")
  ,("desktop/plugins/public/network/docs/setup.mdx", spaces >> "debugImplementation 'com.facebook.flipper:flipper-network-plugin:" *> releaseVersion <* "'")
  ,("desktop/plugins/public/fresco/docs/setup.mdx", spaces >> "debugImplementation 'com.facebook.flipper:flipper-images-plugin:" *> releaseVersion <* "'")
  ,("docs/getting-started/react-native-ios.mdx", spaces >> "use_flipper!('Flipper' => '" *> releaseVersion <* "')" <* many anyChar)
  ,("docs/getting-started/react-native-ios.mdx", spaces >> "flipperkit_version = '" *> releaseVersion <* "'" <* many anyChar)
  ,("docs/getting-started/react-native.mdx", many anyChar >> "`FLIPPER_VERSION=" *> releaseVersion <* "`.")
  ,("docs/getting-started/react-native.mdx", many anyChar >> "`use_flipper!({ 'Flipper' => '" *> releaseVersion <* "' })`.")
  ]

snapshotReplacements :: [(FilePath, Pattern Version)]
snapshotReplacements =
  [("gradle.properties", "VERSION_NAME=" *> anyVersion)
  ,("docs/getting-started/android-native.mdx", spaces >> "debugImplementation 'com.facebook.flipper:flipper:" *> snapshotVersion <* "'")
  ,("docs/getting-started/android-native.mdx", spaces >> "releaseImplementation 'com.facebook.flipper:flipper-noop:" *> snapshotVersion <* "'")
  ]

flipperPath :: FilePath -> FilePath
flipperPath basePath =
  basePath </> "xplat" </> "sonar"

-- * Patterns

releaseVersion :: Pattern Version
releaseVersion =
  Version <$> plus digit <> "." <> plus digit <> "." <> plus digit

snapshotVersion :: Pattern Version
snapshotVersion =
  Version <$> plus digit <> "." <> plus digit <> "." <> plus digit <> "-SNAPSHOT"

anyVersion :: Pattern Version
anyVersion =
  Version <$> plus digit <> "." <> plus digit <> "." <> plus (char '-' <|> alphaNum)

-- * Application logic

newtype Version = Version Text
  deriving (Show, Eq)

unversion (Version v) = v

data BumpMode = ModeRelease | ModeSnapshot
  deriving (Show, Eq)

data BumpArguments = BumpArguments
  { argVersion :: Version
  , argMode :: BumpMode
  } deriving (Show, Eq)

parser :: Turtle.Parser BumpArguments
parser = BumpArguments
  <$> (Version <$> argText "version" "Version to bump to, e.g. 1.0.2")
  <*> ((\b -> if b then ModeSnapshot else ModeRelease) <$> switch "snapshot" 's' "Change SNAPSHOT references instead of release ones")

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

replaceLine :: Version -> Pattern Version -> Pattern Version -> Line -> Shell Line
replaceLine newVersion matcher pttrn l =
  if match pttrn (lineToText l) == empty then pure l
  else sed (unversion newVersion <$ anyVersion) $ pure l

main :: IO ()
main = do
  args <- options "Flipper Version Bumper" parser
  let newVersion = argVersion args
  let (versionMatcher, replacements) = case argMode args of
        ModeRelease -> (releaseVersion, releaseReplacements)
        ModeSnapshot -> (snapshotVersion, snapshotReplacements)

  let isVersionValid = match versionMatcher (unversion newVersion)
  when (null isVersionValid) $ do
    printf ("Invalid version specified: "%w%".\n") newVersion
    exit $ ExitFailure 2

  projectRoot <- findProjectRoot =<< pwd
  let flipperDir = flipperPath <$> projectRoot
  flipperDir_ <- case flipperDir of
        Just f -> pure f
        Nothing -> die "Couldn't determine flipper location."

  printf ("Starting bump to "%w%".\n") newVersion
  forM_ replacements $ \(path, pttrn) -> do
      let absPath = flipperDir_ </> path
      printf ("Updating version in "%w%"\n") absPath
      lines <- T.lines <$> readTextFile absPath
      newLines :: [Line] <- flip fold F.mconcat . sequence $ replaceLine newVersion versionMatcher pttrn <$> catMaybes (textToLine <$> lines)
      writeTextFile absPath . T.unlines $ lineToText <$> newLines
  echo "Done!"
