import React from 'react';
import { useTranslation } from '../../i18n/i18n';
import { Card, Flex, Link } from '@aws-amplify/ui-react';

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
  const { t } = useTranslation();
  if (!enabled) return null;

  return (
    <Card backgroundColor={backgroundColor} width="100%">
      <Flex direction="column" alignItems={alignMap[align]} gap="xs" padding="l">
        <Flex direction="row" gap="m">
          {privacyPolicyUrl && (
            <Link href={privacyPolicyUrl} isExternal color={fontColor}>
              {t('footer.privacyPolicy')}
            </Link>
          )}
          {websiteUrl && (
            <Link href={websiteUrl} isExternal color={fontColor}>
              {t('footer.website')}
            </Link>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

export default Footer;