import React from 'react';
import { Card, Flex, Text, Link } from '@aws-amplify/ui-react';

interface FooterProps {
  privacyPolicyUrl?: string;
  websiteUrl?: string;
  enabled?: boolean;
  backgroundColor?: string;
  fontColor?: string;
  align?: 'left' | 'center' | 'right';
}

const alignMap = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const;

const Footer: React.FC<FooterProps> = ({
  privacyPolicyUrl, websiteUrl, enabled = true, backgroundColor, fontColor, align = 'center'
}) => {
  if (!enabled) return null;

  return (
    <Card variation="elevated" backgroundColor={backgroundColor} width="100%">
      <Flex direction="column" alignItems={alignMap[align]} gap="xs" padding="l">
        <Flex direction="row" gap="m">
          {privacyPolicyUrl && (
            <Link href={privacyPolicyUrl} isExternal color={fontColor}>
              Privacy Policy
            </Link>
          )}
          {websiteUrl && (
            <Link href={websiteUrl} isExternal color={fontColor}>
              Website
            </Link>
          )}
        </Flex>
        <Text fontSize="small" color={fontColor}>
          © {new Date().getFullYear()} Identity Verification SDK
        </Text>
      </Flex>
    </Card>
  );
};

export default Footer;