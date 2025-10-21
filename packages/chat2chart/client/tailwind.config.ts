import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: 'var(--color-brand-primary)',
                    hover: 'var(--color-brand-primary-hover)',
                    active: 'var(--color-brand-primary-active)',
                    foreground: 'var(--color-brand-primary-foreground)',
                },
                bg: {
                    DEFAULT: 'var(--layout-background)',
                    elevated: 'var(--layout-panel-background-raised)',
                    muted: 'var(--layout-panel-background-subtle)',
                    subtle: 'var(--layout-panel-background-subtle)',
                    container: 'var(--layout-panel-background)',
                },
                border: {
                    DEFAULT: 'var(--color-border-primary)',
                    light: 'var(--color-border-secondary)',
                    strong: 'var(--color-border-primary-strong)',
                },
                text: {
                    DEFAULT: 'var(--color-text-primary)',
                    secondary: 'var(--color-text-secondary)',
                    tertiary: 'var(--color-text-tertiary)',
                    disabled: 'var(--color-text-quaternary)',
                    inverse: 'var(--color-brand-primary-foreground)',
                },
            },
            fontFamily: {
                sans: 'var(--font-sans)',
                mono: 'var(--font-mono)',
            },
            fontSize: {
                xs: 'var(--font-size-xs)',
                sm: 'var(--font-size-sm)',
                base: 'var(--font-size-base)',
                lg: 'var(--font-size-lg)',
                xl: 'var(--font-size-xl)',
                '2xl': 'var(--font-size-2xl)',
                '3xl': 'var(--font-size-3xl)',
                '4xl': 'var(--font-size-4xl)',
            },
            spacing: {
                '0': 'var(--space-0)',
                '1': 'var(--space-1)',
                '2': 'var(--space-2)',
                '3': 'var(--space-3)',
                '4': 'var(--space-4)',
                '5': 'var(--space-5)',
                '6': 'var(--space-6)',
                '8': 'var(--space-8)',
                '10': 'var(--space-10)',
                '12': 'var(--space-12)',
                '16': 'var(--space-16)',
                '20': 'var(--space-20)',
                '24': 'var(--space-24)',
            },
            borderRadius: {
                none: '0',
                sm: 'var(--ant-border-radius-sm)',
                DEFAULT: 'var(--ant-border-radius)',
                md: 'var(--ant-border-radius-md)',
                lg: 'var(--ant-border-radius-lg)',
                xl: '12px',
                full: '50%',
            },
            boxShadow: {
                sm: 'var(--shadow-sm)',
                DEFAULT: 'var(--shadow-md)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                xl: 'var(--shadow-xl)',
            },
            transitionDuration: {
                fast: '150ms',
                DEFAULT: '250ms',
                slow: '350ms',
            },
            zIndex: {
                base: '0',
                dropdown: '1000',
                sticky: '1020',
                fixed: '1030',
                'modal-backdrop': '1040',
                modal: '1050',
                popover: '1060',
                tooltip: '1070',
            },
            brightness: {
                25: '.25',
            },
        },
    },
    plugins: [],
};
export default config;
