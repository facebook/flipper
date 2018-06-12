#!/bin/bash
TOKEN=$(secrets_tool get SONAR_GITHUB_TOKEN)
GITHUB_ORG="facebook"
GITHUB_REPO="Sonar"

cd ../../ || exit

function jsonValue() {
  python -c 'import json,sys;obj=json.load(sys.stdin);print obj["'$1'"]' || echo ''
}

git -c http.proxy=fwdproxy:8080 -c https.proxy=fwdproxy:8080 clone https://github.com/facebook/Sonar.git sonar-public
cp sonar/scripts/sandcastle-build.sh sonar-public/scripts/sandcastle-build.sh
# third-party dependencies are not on github, so we need to copy them in place
cp -r sonar/third-party sonar-public/third-party
cd sonar-public/scripts && ./sandcastle-build.sh "$(git rev-list HEAD --count || echo 0)"

VERSION=$(plutil -p ./sonar-public/dist/mac/Sonar.app/Contents/Info.plist | awk '/CFBundleShortVersionString/ {print substr($3, 2, length($3)-2)}')

RELEASE_JSON=$(curl -x fwdproxy:8080 --silent --data '{
  "tag_name": "v'$VERSION'",
  "target_commitish": "master",
  "name": "v'$VERSION'",
  "body": "",
  "draft": false,
  "prerelease": false
}' https://api.github.com/repos/$GITHUB_ORG/$GITHUB_REPO/releases?access_token=$TOKEN)

RELEASE_ID=$(echo $RELEASE_JSON | jsonValue id)

if [ -z "${RELEASE_ID}" ]; then
    echo $RELEASE_JSON
    exit 1
fi

echo "Created GitHub release ID: $RELEASE_ID"
UPLOAD_URL=$(echo $RELEASE_JSON | jsonValue upload_url| sed -e 's#{?name,label}##')
ASSET_JSON=$(curl -x fwdproxy:8080 --silent $UPLOAD_URL'?access_token='$TOKEN'&name=Sonar.zip' --header 'Content-Type: application/zip' --upload-file ./sonar-public/dist/Sonar.zip -X POST)

DOWNLOAD_URL=$(echo $ASSET_JSON | jsonValue browser_download_url)

if [ -z "${DOWNLOAD_URL}" ]; then
    echo $ASSET_JSON
    exit 1
fi

echo "Released Sonar v$VERSION"
echo "Download: $DOWNLOAD_URL"
