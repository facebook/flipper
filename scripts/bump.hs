#!/usr/bin/env stack
-- stack --resolver lts-12.7 --install-ghc runghc --package turtle --package system-filepath --package pseudomacros --package foldl

{-# OPTIONS_GHC -fno-warn-name-shadowing #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE KindSignatures #-}
{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE FlexibleContexts #-}

import Prelude hiding (FilePath)
import Turtle

import Data.Maybe (catMaybes)
import Control.Monad (forM_)
import PseudoMacros (__FILE__)

import qualified Filesystem.Path.CurrentOS as Path
import qualified Data.Text as T
import qualified Control.Foldl as F

-- * Global settings

replacements :: [(FilePath, Pattern Version)]
replacements =
  [("gradle.properties", "VERSION_NAME=" *> version)
  ,("docs/getting-started.md", spaces >> "debugImplementation 'com.facebook.flipper:flipper:" *> version <* "'")
  ]

flipperPath :: FilePath -> FilePath
flipperPath basePath =
  basePath </> "xplat" </> "sonar"

-- * Patterns

version :: Pattern Version
version =
  Version <$> plus digit <> "." <> plus digit <> "." <> plus (char '-' <|> alphaNum)

-- * Application logic

newtype Version = Version Text
  deriving (Show, Eq)

unversion (Version v) = v

parser :: Turtle.Parser Version
parser = Version <$> argText "version" "Version to bump to, e.g. 1.0.2"

-- | Provide a path to the directory this very file resides in through some
-- arcane magic.
thisDirectory :: IO FilePath
thisDirectory = do
  let filePath :: FilePath = $__FILE__
  currentDir <- pwd
  return . Path.parent $ currentDir </> filePath

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

replaceLine :: Version -> Pattern Version -> Line -> Shell Line
replaceLine newVersion pttrn l =
  if match pttrn (lineToText l) == empty then pure l
  else sed (const (unversion newVersion) <$> version) $ pure l

main :: IO ()
main = do
  newVersion <- options "Flipper Version Bumper" parser
  let isVersionValid = match version (unversion newVersion)
  when (null isVersionValid) $ do
    printf ("Invalid version specified: "%w%".\n") newVersion
    exit $ ExitFailure 2

  directory <- thisDirectory
  projectRoot <- findProjectRoot directory
  let flipperDir = flipperPath <$> projectRoot
  flipperDir_ <- case flipperDir of
        Just f -> pure f
        Nothing -> die "Couldn't determine flipper location."

  printf ("Starting bump to "%w%".\n") newVersion
  forM_ replacements $ \(path, pttrn) -> do
      let absPath = flipperDir_ </> path
      printf ("Updating version in "%w%"\n") absPath
      lines <- T.lines <$> readTextFile absPath
      newLines :: [Line] <- flip fold F.mconcat . sequence $ replaceLine newVersion pttrn <$> catMaybes (textToLine <$> lines)
      writeTextFile absPath . T.unlines $ lineToText <$> newLines
  echo "Done!"
