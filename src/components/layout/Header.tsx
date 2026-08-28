import React from 'react';
import { Flex, Image, Heading, Text } from '@aws-amplify/ui-react';
import { useTranslation, type Language } from '../../i18n/i18n';

interface HeaderProps {
  logoUrl?: string;
  title?: string;
  enabled?: boolean;
  backgroundColor?: string;
  fontColor?: string;
  align?: 'left' | 'center' | 'right';
  primaryColor?: string;
}

const alignMap = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const;

const Header: React.FC<HeaderProps> = ({
  logoUrl,
  title,
  enabled = true,
  backgroundColor,
  fontColor,
  align = 'left',
  primaryColor = '#0a1a3c',
}) => {
  const { lang, setLang } = useTranslation();

  if (!enabled) return null;

  return (
    <div style={{
      backgroundColor: backgroundColor || '#ffffff',
      width: '100%',
      borderBottom: '1px solid #e2e8f0',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <Flex
          direction="row"
          alignItems="center"
          justifyContent={alignMap[align]}
          gap="m"
          flex="1"
        >
          {logoUrl && (
            <Image
              src={logoUrl}
              alt="Logo"
              height={{ base: '40px', large: '50px' }}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <Text
            onClick={() => setLang('en' as Language)}
            style={{
              cursor: 'pointer',
              fontWeight: lang === 'en' ? 600 : 400,
              color: lang === 'en' ? primaryColor : '#94a3b8',
              padding: '4px 8px',
              fontSize: '13px',
              userSelect: 'none',
              transition: 'color 0.15s',
            }}
          >
            EN
          </Text>
          <Text style={{ color: '#cbd5e1', fontSize: '13px' }}>|</Text>
          <Text
            onClick={() => setLang('es' as Language)}
            style={{
              cursor: 'pointer',
              fontWeight: lang === 'es' ? 600 : 400,
              color: lang === 'es' ? primaryColor : '#94a3b8',
              padding: '4px 8px',
              fontSize: '13px',
              userSelect: 'none',
              transition: 'color 0.15s',
            }}
          >
            ES
          </Text>
        </div>
      </div>
    </div>
  );
};

export default Header;