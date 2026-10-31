import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Plain JS served as-is from public/ (no tsconfig covers it), still
          // linted with type info rather than ignored.
          allowDefaultProject: ['forge-ui/public/*.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Zero-tolerance: no `any` (CLAUDE.md). Allow with explicit comment + TODO only.
      '@typescript-eslint/no-explicit-any': 'error',
      // Explicit return types on exported/module-boundary functions.
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // No unused vars (dead-code rule); allow leading-underscore opt-out.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Keep zod out of the UI bundle (FO-30). The shared root runs z.enum() at
    // load, so even a constant imported from it drags the whole validator in.
    // Two globs, not `*.{ts,tsx}`: the root brace-expansion override breaks
    // minimatch 3's brace handling, and ESLint crashes on `{a,b}` patterns.
    files: ['forge-ui/src/**/*.ts', 'forge-ui/src/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@forge/shared',
              allowTypeImports: true,
              message: 'Import values from @forge/shared/constants; the root pulls zod in.',
            },
            {
              name: 'zod',
              allowTypeImports: true,
              message: 'zod is kept out of the UI bundle (FO-30); write a small guard instead.',
            },
          ],
          patterns: [
            {
              group: ['zod/*'],
              allowTypeImports: true,
              message: 'zod is kept out of the UI bundle (FO-30); write a small guard instead.',
            },
          ],
        },
      ],
    },
  },
);
