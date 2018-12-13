#!/usr/bin/env stack
-- stack --resolver lts-9.0 --install-ghc runghc --package turtle --package system-filepath --package pseudomacros --package megaparsec --package bifunctors

{-

This script verifies that for a given version number, all Litho artifacts were
successfully uploaded to Bintray. Due to service flakiness, sometimes one or
more artifacts don't actually end up getting published and we want to have
an automated way to check whether or not an upload succeded.

This script works by simply passing it the version number you want to check.
On Mac OS you may also need to disable IPv6 because reasons.

  scripts/verify-bintray-upload.hs 0.5.0

Or with disabling the IPv6 stack in the JVM:

  env JAVA_TOOL_OPTIONS="-Djava.net.preferIPv6Addresses=false" scripts/verify-bintray-upload.hs 0.5.0

-}

{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE ViewPatterns #-}

import Prelude hiding (FilePath)
import Turtle

import Control.Arrow ((>>>))
import Data.Bifunctor (first)
import Data.Maybe (fromMaybe, catMaybes)
import Data.List.NonEmpty (fromList)
import PseudoMacros (__FILE__)

import qualified Filesystem.Path.CurrentOS as Path
import qualified Control.Monad.Managed as Managed
import qualified Text.Megaparsec.Text as MT
import qualified Text.Megaparsec as M
import qualified Data.Text as T
import qualified Control.Foldl as Fold

-- * Global settings

data RemoteRepository = RemoteRepository
  { repoId :: Text
  , repoLayout :: Maybe Text
  , repoUrl :: Text }

remoteRepositoryToString :: RemoteRepository -> Text
remoteRepositoryToString RemoteRepository{..} =
  T.intercalate "::"
    [ repoId
    , fromMaybe "" repoLayout
    , repoUrl
    ]

remoteRepositories :: [RemoteRepository]
remoteRepositories =
  [ RemoteRepository "jcenter" Nothing "https://jcenter.bintray.com/"
  , RemoteRepository "google" Nothing "https://maven.google.com/"
  ]

-- * Application logic

newtype Version = Version Text

-- | Strip a leading 'v' if present and wrap in a newtype.
parseVersion :: Text -> Version
parseVersion (T.stripPrefix "v" -> Just v) = Version v
parseVersion v                             = Version v

parser :: Turtle.Parser Version
parser = parseVersion <$> argText "VERSION" "Version number to verify"

data MvnArtifact = MvnArtifact
  { mvnArtifactId :: Text
  , mvnPackaging :: Text
  } deriving Show

-- | Provide a path to the directory this very file resides in through some
-- arcane magic.
thisDirectory :: IO FilePath
thisDirectory = do
  let filePath :: FilePath = $__FILE__
  currentDir <- pwd
  return . Path.parent $ currentDir </> filePath

mkFakeMavenSettings
  :: Managed.MonadManaged m
  => m FilePath
mkFakeMavenSettings = do
  mavenTmp <- using (mktempdir "/tmp" "fbm2")
  output (mavenTmp </> "settings.xml") $
    "<settings>" <|> ("<localRepository>" <> pure (unsafeTextToLine (format fp mavenTmp)) <>  "</localRepository>") <|> "</settings>"
  return mavenTmp

parseMvnArtifact :: Text -> Either Text MvnArtifact
parseMvnArtifact = M.parse (mvnParser <* M.eof) "<input>" >>> first (T.pack . M.parseErrorPretty)
  where
    pomParser :: MT.Parser (Text, Text)
    pomParser = do
      identifier <- T.strip . T.pack <$> M.someTill M.printChar (M.char '=')
      M.space
      value <- T.strip . T.pack <$> M.some M.printChar

      return (identifier, value)

    emptyLineParser :: forall a. MT.Parser (Maybe a)
    emptyLineParser = M.some M.spaceChar >> M.optional M.newline *> pure Nothing

    commentParser :: forall a. MT.Parser (Maybe a)
    commentParser = M.char '#' >> M.manyTill M.anyChar M.newline *> pure Nothing

    mvnParser :: MT.Parser MvnArtifact
    mvnParser = do
      pomItems <- M.many $ (commentParser <|> (Just <$> pomParser) <* M.eol) <|> emptyLineParser
      case reducePomTokens (catMaybes pomItems) of
        Just a -> return a
        Nothing -> M.unexpected (M.Label $ fromList "Missing POM identifiers.")

    reducePomTokens :: [(Text, Text)] -> Maybe MvnArtifact
    reducePomTokens ts = do
      mvnArtifactId <- lookup "POM_ARTIFACT_ID" ts
      mvnPackaging <- lookup "POM_PACKAGING" ts
      return MvnArtifact{..}

mvnArtifactToVersionedIdentifier :: MvnArtifact -> Text -> Text
mvnArtifactToVersionedIdentifier MvnArtifact{..} version =
  format ("com.facebook.litho:"%s%":"%s%":"%s) mvnArtifactId version mvnPackaging

buildMvnGetCommand :: MvnArtifact -> Version -> FilePath -> (T.Text, [T.Text])
buildMvnGetCommand artifact (Version version) configDir =
  ( "mvn"
  , [ "dependency:get"
    , "-gs"
    , format fp (configDir </> "settings.xml")
    , "-Dartifact=" <> (mvnArtifactToVersionedIdentifier artifact version)
    , "-DremoteRepositories=" <> T.intercalate "," (remoteRepositoryToString <$> remoteRepositories)
    -- Would be nice to also check transitive deps, but mvn get doesn't support resolving transitive AARs.
    , "-Dtransitive=false"]
  )

-- | Ensure that the given directory sits at least one
--   level deep inside the given prefix.
isSubDir :: FilePath -> FilePath -> Bool
isSubDir prefix' path =
  stripPrefix prefix' path & \case
    Just dir -> length (splitDirectories dir) > 1
    Nothing -> False

foldResult :: FoldM IO (Maybe (MvnArtifact, Bool)) Bool
foldResult = FoldM step (pure True) pure
    where
        step _ (Just (mvnArtifact, False)) =
          printf ("Failed to download artifact "%w%".\n") mvnArtifact >> return False
        step prev _ =
          return prev

main :: IO ()
main = do
  version <- options "Bintray Upload Verifier" parser
  this <- thisDirectory
  rootDir <- realpath $ this </> ".."

  whichMvn <- which "mvn"
  case whichMvn of
    Just _ -> return ()
    Nothing -> die "This tool requires `mvn` (Apache Maven) to be on your $PATH."

  let parseProg = do
      gradleProperties :: FilePath <- realpath =<< find (suffix "/gradle.properties") rootDir
      guard $ isSubDir rootDir gradleProperties
      contents <- liftIO $ readTextFile gradleProperties
      case parseMvnArtifact contents of
        Left err' -> do
          printf ("Skipping unsupported file '"%fp%"' because of error "%s%".\n") gradleProperties err'
          return Nothing
        Right mvnArtifact -> do
          printf ("Downloading Maven artifact for "%w%" ...\n") mvnArtifact
          return $ Just mvnArtifact

  let runProg mvnArtifact = do
      mavenTmp <- mkFakeMavenSettings
      let (cmd, args) = buildMvnGetCommand mvnArtifact version mavenTmp
      ret <- proc cmd args empty
      case ret of
        ExitSuccess ->
          return (mvnArtifact, True)
        ExitFailure code -> do
          return (mvnArtifact, False)

  artifacts :: [MvnArtifact] <- catMaybes <$> fold parseProg Fold.list
  foldIO (parallel (flip fold Fold.head . runProg <$> artifacts)) foldResult >>= \case
     True -> do
       echo "All artifacts seem to have been uploaded. Sweet!"
       exit ExitSuccess
     False -> do
       err "ERROR: Some artifacts are missing from Bintray!"
       exit $ ExitFailure 1

