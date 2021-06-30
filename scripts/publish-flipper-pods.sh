#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -e

if [ -z "$1" ]
then
    echo "Please pass the root directory of flipper repository as a first argument."
    exit 1
fi

if [ -z "$2" ]
then
    echo "Please pass the pod name to push, It just accepts 'Flipper' and 'FlipperKit', do not append podspec at the end"
    exit 1
fi

if [[ "$2" != "Flipper" ]] && [[ "$2" != "FlipperKit" ]]
then
    echo "This script just supports Flipper and FlipperKit pods. Please send either Flipper or FlipperKit as an argument."
    exit 1
fi

FLIPPER_DIR=$1
POD_NAME=$2
POD_TO_PUSH="$FLIPPER_DIR/$POD_NAME.podspec"

if ! [[ -f "$POD_TO_PUSH" ]]; then
    echo "$POD_TO_PUSH does not exist. Please check the pod name."
fi

POD_VERSION_TAG=$(< "$POD_TO_PUSH" grep "flipperkit_version =" )
POD_VERSION="${POD_VERSION_TAG##* }"
POD_VERSION=$(sed -e "s/^'//" -e "s/'$//" <<<"$POD_VERSION")

push_pods_and_retry () {
    echo "Pushing $POD_VERSION of $POD_NAME..."
    FLAGS="--use-libraries --allow-warnings --verbose --skip-import-validation"
    if [[ "$POD_NAME" == "FlipperKit" ]]
    then
        FLAGS="$FLAGS --synchronous"
    fi
    POD_COMMAND="pod trunk push $POD_TO_PUSH $FLAGS"
    MAX_ATTEMPT=4
    ATTEMPT_NUM=0
    TIME_TO_WAIT=1
    until [ "$ATTEMPT_NUM" -ge "$MAX_ATTEMPT" ]
    do
        echo "Retry attempt $ATTEMPT_NUM..."
        if [ "$ATTEMPT_NUM" -ge 1 ]
        then
        echo "Retry attempt $ATTEMPT_NUM..."
        fi
        $POD_COMMAND && break
        echo "Failed to push. Will Retry in $TIME_TO_WAIT minute."
        sleep $((60*TIME_TO_WAIT))
        # Exponential back off.
        TIME_TO_WAIT=$((2*TIME_TO_WAIT))
        ATTEMPT_NUM=$((ATTEMPT_NUM+1))
    done

    if [ "$ATTEMPT_NUM" -ge "$MAX_ATTEMPT" ]
    then
        echo "Exhausted all retry attempts and failed to push, please try again later..."
        exit 1
    fi
}

ENDPOINT_TO_CHECK="https://github.com/CocoaPods/Specs/blob/master/Specs/a/e/a/Flipper/$POD_VERSION"
if [[ "$POD_NAME" == "FlipperKit" ]]
then
    STATUS_CODE=$(curl -LI "$ENDPOINT_TO_CHECK" -o /dev/null -w '%{http_code}\n' -s)
    if ! [[ $STATUS_CODE == 200 ]]
    then
    echo "Please push $POD_VERSION of Flipper before pushing $POD_VERSION of FlipperKit."
    exit 1;
    fi
    ENDPOINT_TO_CHECK="https://github.com/CocoaPods/Specs/tree/master/Specs/3/2/5/FlipperKit/$POD_VERSION"
fi

echo "Verifying if $POD_VERSION already pushed for $POD_NAME..."
echo "Curling $ENDPOINT_TO_CHECK"
STATUS_CODE=$(curl -LI "$ENDPOINT_TO_CHECK" -o /dev/null -w '%{http_code}\n' -s)
echo "$STATUS_CODE"

if  [[ "$STATUS_CODE" -ge 400 ]]
then
    push_pods_and_retry "$@"
else
    echo "$POD_VERSION of $POD_NAME is already pushed."
    exit 0
fi

echo "Successfully published $POD_VERSION of $POD_NAME."
