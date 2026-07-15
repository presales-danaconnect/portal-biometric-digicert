import tenantsData from './tenants.json';

export type Alignment = 'left' | 'center' | 'right';

export interface TenantConfig {
  headerTitle: string;
  headerLogoUrl: string;
  footerPrivacyPolicyUrl: string;
  footerWebsiteUrl: string;
  webhookUrl: string;
  livenessConfidenceThreshold: number;
  compareFacesSimilarityThreshold: number;
  colors: {
    primary: string;
    headerBackground: string;
    footerBackground: string;
    headerFontColor: string;
    footerFontColor: string;
  };
  layout: {
    headerAlign: Alignment;
    footerAlign: Alignment;
  };
}

type TenantsMap = Record<string, TenantConfig>;

const tenants = tenantsData as TenantsMap;

/**
 * Resolves tenant config by tenant ID (numeric string).
 * Falls back to "default" config if tenant is not found.
 */
export function getTenantConfig(tenantId: string): TenantConfig {
  return tenants[tenantId] || tenants['default'];
}
