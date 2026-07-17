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
  dataVerificationApiUrl?: string;
  requiresBackDocument?: boolean;
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

/**
 * requiresBackDocument defaults to false when not explicitly set, so new
 * tenants configured without this field don't accidentally require a back
 * document capture (many IDs like passports or Venezuelan cédulas only
 * have a front side).
 */
export function requiresBackDocument(config: TenantConfig): boolean {
  return config.requiresBackDocument ?? false;
}
