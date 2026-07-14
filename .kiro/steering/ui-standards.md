---
inclusion: always
---

# UI Standards & Design Guidelines

## Design Philosophy
- **Minimalist**: Clean, uncluttered interfaces
- **Modern**: Contemporary design patterns
- **Professional**: Trustworthy appearance for identity verification
- **Neutral**: Colors that don't clash with client branding
- **Responsive**: Mobile-first, works on all device sizes

## Layout Structure

### Fixed 3-Section Layout
```
┌─────────────────────────────────┐
│          HEADER                 │
│  (Optional per tenant)          │
├─────────────────────────────────┤
│                                 │
│          CONTENT                │
│  (Service-specific UI)          │
│                                 │
├─────────────────────────────────┤
│          FOOTER                 │
│  (Optional per tenant)          │
└─────────────────────────────────┘
```

### Header Configuration (Optional)
- **When to Show**: Based on tenant configuration `header_enabled: true`
- **Content Options**:
  - Logo (from `logo_url`)
  - Title/Display Name (from `display_name`)
  - Empty (if no configuration provided)
- **Behavior**: If not configured, header area collapses completely

### Footer Configuration (Optional)
- **When to Show**: Based on tenant configuration `footer_enabled: true`
- **Content Options**:
  - Privacy Policy Link (from `privacy_policy_url`)
  - Website Link (from `website_url`)
  - Copyright information
  - Empty (if no configuration provided)
- **Behavior**: If not configured, footer area collapses completely

## Tenant Configuration UI Options

### Configuration Schema
```typescript
interface TenantUIConfig {
  header_enabled?: boolean;      // Show/hide header
  logo_url?: string;             // URL to tenant logo
  display_name?: string;         // Tenant display name
  
  footer_enabled?: boolean;      // Show/hide footer
  privacy_policy_url?: string;   // Privacy policy URL
  website_url?: string;          // Tenant website URL
  
  // Future extensibility
  primary_color?: string;        // Custom primary color
  secondary_color?: string;      // Custom secondary color
}
```

### Rendering Logic
```typescript
// Example component structure
const VerificationPage = ({ tenantConfig }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Conditional Header */}
      {tenantConfig.header_enabled && (
        <Header 
          logo={tenantConfig.logo_url}
          title={tenantConfig.display_name}
        />
      )}
      
      {/* Main Content Area */}
      <main className="flex-grow">
        <VerificationContent service={service} />
      </main>
      
      {/* Conditional Footer */}
      {tenantConfig.footer_enabled && (
        <Footer
          privacyPolicyUrl={tenantConfig.privacy_policy_url}
          websiteUrl={tenantConfig.website_url}
        />
      )}
    </div>
  );
};
```

## Color Palette & Typography

### Base Colors (Neutral & Professional)
```css
/* Core Palette */
--color-primary: #3b82f6;       /* Professional blue */
--color-secondary: #6b7280;     /* Neutral gray */
--color-success: #10b981;       /* Success green */
--color-error: #ef4444;         /* Error red */
--color-warning: #f59e0b;       /* Warning amber */

/* Backgrounds */
--color-background: #ffffff;
--color-surface: #f9fafb;
--color-border: #e5e7eb;

/* Text */
--color-text-primary: #111827;
--color-text-secondary: #6b7280;
--color-text-muted: #9ca3af;
```

### Typography Scale
- **Font Family**: System fonts stack (prefers -apple-system, BlinkMacSystemFont, 'Segoe UI', etc.)
- **Base Font Size**: 16px (mobile-first)
- **Scale**: 0.875rem (14px) → 1rem (16px) → 1.125rem (18px) → 1.25rem (20px) → 1.5rem (24px)

## Component Guidelines

### Button Styles
```css
/* Primary Button */
.btn-primary {
  background-color: var(--color-primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
}

/* Secondary Button */
.btn-secondary {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

/* Button States */
.btn-primary:hover { background-color: #2563eb; }
.btn-primary:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
```

### Form Elements
- **Input Fields**: Clear labels, appropriate sizing, validation states
- **File Upload**: Clear instructions, progress indicators
- **Camera Capture**: Real-time feedback, quality indicators

## Service-Specific UI Components

### Liveness Check
- **Camera Feed**: Full-screen or large preview
- **Instructions**: Clear step-by-step guidance
- **Status Indicators**: Processing, success, failure states
- **Action Buttons**: Start, retry, cancel

### OCR Verification
- **Document Upload**: Drag & drop or file selection
- **Preview Area**: Document image preview
- **Extracted Data**: Structured display of OCR results
- **Validation**: Highlight issues or missing information

### Face Comparison
- **Image Upload Areas**: Two distinct areas for reference and comparison
- **Side-by-Side Preview**: Visual comparison
- **Result Display**: Similarity score with confidence indicator

## Responsive Design

### Breakpoints
```css
/* Mobile-first approach */
/* Base styles apply to mobile */

/* Tablet: 768px and up */
@media (min-width: 768px) {
  .container { max-width: 768px; }
}

/* Desktop: 1024px and up */
@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}

/* Large Desktop: 1280px and up */
@media (min-width: 1280px) {
  .container { max-width: 1280px; }
}
```

### Mobile-Specific Considerations
- **Touch Targets**: Minimum 44x44px for interactive elements
- **Font Sizes**: Slightly larger for readability on mobile
- **Spacing**: Adequate spacing between interactive elements
- **Orientation**: Support for both portrait and landscape

## Animation & Feedback

### Micro-interactions
- **Button Press**: Subtle scale/opacity change
- **Form Validation**: Immediate visual feedback
- **Loading States**: Smooth transitions between states
- **Success/Failure**: Clear, non-intrusive notifications

### Progress Indicators
- **Linear Progress**: For multi-step processes
- **Spinner**: For short wait times
- **Skeleton Screens**: For content loading

## Accessibility Standards

### WCAG Compliance Targets
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements keyboard accessible
- **Screen Reader Support**: Semantic HTML, proper ARIA labels
- **Focus Management**: Logical focus order, visible focus indicators

### ARIA Implementation
```tsx
// Example accessible component
<button
  aria-label="Start face verification"
  aria-describedby="liveness-instructions"
  disabled={isProcessing}
>
  Start Verification
</button>
```

## Implementation Notes

### CSS Strategy
- **Preference**: Tailwind CSS for utility-first styling
- **Custom Styles**: Minimal custom CSS, extend Tailwind as needed
- **Theming**: CSS custom properties for theme switching

### Component Library Approach
- **Build vs Buy**: Build custom components for branding control
- **Consistency**: Shared design tokens across all components
- **Documentation**: Storybook or similar for component documentation

### Performance Considerations
- **Image Optimization**: Lazy loading, proper formats, compression
- **Bundle Size**: Code splitting, tree shaking
- **Render Performance**: Memoization, virtual scrolling if needed