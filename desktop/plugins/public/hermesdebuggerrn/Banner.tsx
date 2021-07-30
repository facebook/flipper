/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {styled, colors, FlexRow, Text, GK} from 'flipper';
import {Typography} from 'antd';

const BannerContainer = styled(FlexRow)({
  height: '30px',
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#2bb673', // Hermes green.
});

const BannerText = styled(Text)({
  color: colors.white,
  fontSize: 14,
  lineHeight: '20px',
});

const BannerLink = styled(CustomLink)({
  color: colors.white,
  textDecoration: 'underline',
  '&:hover': {
    cursor: 'pointer',
    color: '#303846',
  },
});

function CustomLink(props: {
  href: string;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Typography.Link
      className={props.className}
      href={props.href}
      style={props.style}>
      {props.children || props.href}
    </Typography.Link>
  );
}

export const isBannerEnabled: () => boolean = function () {
  return GK.get('flipper_plugin_hermes_debugger_survey');
};

export default function Banner() {
  if (!GK.get('flipper_plugin_hermes_debugger_survey')) {
    return null;
  }
  return (
    <BannerContainer>
      <BannerText>
        Help us improve your debugging experience with this{' '}
        <BannerLink href="https://fburl.com/hermessurvey">
          single page survey
        </BannerLink>
        !
      </BannerText>
    </BannerContainer>
  );
}
