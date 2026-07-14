---
inclusion: always
---

# Project Structure & Architecture

## Folder Organization

```
identity-verification-sdk/
├── amplify/                    # AWS Amplify backend configuration
│   ├── auth/                  # Authentication setup (Cognito)
│   │   └── resource.ts        # Auth resource definitions
│   ├── data/                  # Database configuration
│   │   └── resource.ts        # Data models and DynamoDB setup
│   ├── backend.ts            # Main Amplify backend definition
│   ├── package.json          # Amplify dependencies
│   └── tsconfig.json         # TypeScript config for backend
├── src/                       # React frontend source
│   ├── components/           # Reusable UI components
│   │   ├── verification/     # Verification-specific components
│   │   │   ├── LivenessCheck/
│   │   │   ├── OCRVerification/
│   │   │   └── FaceComparison/
│   │   ├── layout/          # Layout components
│   │   │   ├── Header/
│   │   │   ├── Content/
│   │   │   └── Footer/
│   │   └── common/          # Shared components
│   ├── services/            # Business logic and API calls
│   │   ├── verification/    # Verification service implementations
│   │   │   ├── liveness.ts
│   │   │   ├── ocr.ts
│   │   │   └── faceComparison.ts
│   │   ├── tenants/        # Tenant management and resolution
│   │   │   └── tenantService.ts
│   │   ├── webhooks/       # Webhook delivery service
│   │   │   └── webhookService.ts
│   │   └── aws/           # AWS service wrappers
│   │       ├── rekognition.ts
│   │       └── bedrock.ts
│   ├── hooks/             # Custom React hooks
│   │   ├── useTenantConfig.ts
│   │   ├── useVerification.ts
│   │   └── useWebhook.ts
│   ├── types/            # TypeScript type definitions
│   │   ├── verification.ts
│   │   ├── tenant.ts
│   │   └── webhook.ts
│   ├── utils/           # Utility functions
│   │   ├── urlParser.ts
│   │   ├── imageProcessor.ts
│   │   └── validation.ts
│   ├── pages/           # Page components
│   │   ├── VerificationPage.tsx
│   │   ├── ErrorPage.tsx
│   │   └── LoadingPage.tsx
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── public/              # Static assets
└── .kiro/steering/     # Kiro steering files (this directory)
```

## URL Parameter Resolution

### URL Structure
```
https://dominio.com/verify?service={service_type}&tenant={tenant_id}
```

### Parameter Processing Flow
1. **URL Parsing**: Extract `service` and `tenant` parameters
2. **Parameter Validation**:
   - Validate `service` is one of: `liveness`, `ocr`, `compare-faces`
   - Validate `tenant` format (alphanumeric, min/max length)
3. **Tenant Resolution**: Lookup tenant configuration
4. **Service Routing**: Route to appropriate verification component

### Tenant Resolution Process

```typescript
// Example tenant resolution logic
async function resolveTenant(tenantId: string): Promise<TenantConfig> {
  // Current: Environment variable based
  const tenantConfig = process.env[`TENANT_${tenantId}`];
  
  // Parse configuration JSON
  const config = JSON.parse(tenantConfig || '{}');
  
  return {
    tenantId,
    webhookUrl: config.webhook_url,
    displayName: config.display_name,
    logoUrl: config.logo_url,
    headerEnabled: config.header_enabled || false,
    footerEnabled: config.footer_enabled || false,
    privacyPolicyUrl: config.privacy_policy_url,
    websiteUrl: config.website_url
  };
}
```

## Environment Configuration

### Required Environment Variables
```bash
# Tenant configurations (current implementation)
TENANT_acme_corp='{"webhook_url":"https://acme.com/webhook","logo_url":"...","header_enabled":true}'
TENANT_global_tech='{"webhook_url":"https://globaltech.com/verify","footer_enabled":true}'

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Amplify Configuration
AMPLIFY_PROJECT_ID=...
AMPLIFY_BRANCH=main

# Application Settings
APP_DOMAIN=dominio.com
DEFAULT_TIMEOUT=30000  # 30 seconds
MAX_FILE_SIZE=5242880 # 5MB
```

## Route Handling Architecture

### Frontend Routes (React Router)
```typescript
const router = createBrowserRouter([
  {
    path: "/verify",
    element: <VerificationPage />,
    loader: async ({ request }) => {
      // Parse URL parameters
      const url = new URL(request.url);
      const service = url.searchParams.get("service");
      const tenant = url.searchParams.get("tenant");
      
      // Validate parameters
      if (!service || !tenant) {
        throw new Error("Missing required parameters");
      }
      
      // Resolve tenant configuration
      const tenantConfig = await resolveTenant(tenant);
      
      return { service, tenant: tenantConfig };
    },
    errorElement: <ErrorPage />
  }
]);
```

## Component Communication Flow

1. **URL Entry** → **Parameter Parser** → **Tenant Resolver**
2. **Tenant Config** → **Layout Renderer** → **Service Router**
3. **Service Component** → **AWS Service** → **Result Processor**
4. **Result Processor** → **Webhook Delivery** → **Completion UI**

## Key Architectural Decisions

### 1. Separation of Concerns
- **Presentation Layer**: React components for UI
- **Business Logic**: Services directory for core logic
- **Infrastructure**: AWS service wrappers
- **Configuration**: Environment-based tenant management

### 2. Extensibility Design
- **Service Plugins**: Easy to add new verification services
- **Tenant Customization**: Flexible configuration per tenant
- **Webhook Formats**: Support multiple response formats

### 3. Security Layers
- **Input Validation**: Validate all URL parameters
- **Tenant Isolation**: Each tenant has isolated configuration
- **AWS IAM**: Least privilege access to AWS services
- **Data Minimization**: Only process necessary user data