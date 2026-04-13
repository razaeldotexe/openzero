import globals from 'globals';
import pluginJs from '@eslint/js';

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ['**/*.js'],
        languageOptions: {
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
    },
    pluginJs.configs.recommended,
    {
        rules: {
            'no-unused-vars': 'warn',
            'no-undef': 'error',
            'no-console': 'off',
        },
    },
];
