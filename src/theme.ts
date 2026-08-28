import type { Theme } from '@aws-amplify/ui-react';

export function createTenantTheme(colors: {
  primary: string;
  background: string;
}): Theme {
  return {
    name: 'tenant-theme',
    tokens: {
      colors: {
        brand: {
          primary: {
            10: { value: colors.primary },
            20: { value: colors.primary },
            40: { value: colors.primary },
            60: { value: colors.primary },
            80: { value: colors.primary },
            90: { value: colors.primary },
            100: { value: colors.primary },
          },
        },
        background: {
          primary: { value: colors.background },
        },
      },
      components: {
        button: {
          primary: {
            backgroundColor: { value: colors.primary },
            _hover: {
              backgroundColor: { value: colors.primary },
            },
          },
        },
        loader: {
          strokeFilled: { value: colors.primary },
          linear: {
            strokeFilled: { value: colors.primary },
          },
        },
      },
    },
  };
}
