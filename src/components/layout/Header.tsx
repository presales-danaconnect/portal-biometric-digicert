import React from 'react';
import { Card, Flex, Image, Heading } from '@aws-amplify/ui-react';

interface HeaderProps {
  logoUrl?: string;
  title?: string;
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

const Header: React.FC<HeaderProps> = ({
  logoUrl, title, enabled = true, backgroundColor, fontColor, align = 'left'
}) => {
  if (!enabled) return null;

  return (
    <Card variation="elevated" backgroundColor={backgroundColor}  width="100%">
      <Flex
        as="header"
        direction="row"
        alignItems="center"
        justifyContent={alignMap[align]}
        gap="m"
        padding="l"
      >
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Tenant Logo"
            height="60px"
            onError={(e) => {
              if (typeof e !== 'string') {
                (e.target as HTMLImageElement).style.display = 'none';
              }
            }}
          />
        )}
        {title && (
          <Heading level={4} color={fontColor}>
            {title}
          </Heading>
        )}
      </Flex>
    </Card>
  );
};

export default Header;