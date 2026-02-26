import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                document: 'readonly',
                window: 'readonly',
                localStorage: 'readonly',
                io: 'readonly',
                setTimeout: 'readonly',
                Math: 'readonly',
                JSON: 'readonly',
                Array: 'readonly',
                Set: 'readonly',
                Map: 'readonly',
                Object: 'readonly',
                URLSearchParams: 'readonly',
                process: 'readonly',
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'semi': ['error', 'always'],
            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'warn',
            'no-multiple-empty-lines': ['warn', { max: 1 }],
            'no-trailing-spaces': 'warn',
        }
    },
    {
        ignores: ['node_modules/**', 'tests/**']
    }
];
