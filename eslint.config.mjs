// ESLint v9 flat config with modern recommended presets
// - Uses @eslint/js for core JS recommendations
// - Uses typescript-eslint for TS recommendations (no type-checking by default)
// If you enable type-aware rules later, configure parserOptions.project.

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    // Ignore typical build artifacts and deps
    {
        ignores: [
            "out/**",
            "dist/**",
            "node_modules/**",
            "**/*.d.ts",
        ],
    },

    // Core JavaScript recommended rules
    js.configs.recommended,

    // TypeScript recommended rules (no type-checking by default)
    ...tseslint.configs.recommended,

    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                // Set to your tsconfig path and enable for type-aware linting when desired:
                // project: ["./tsconfig.json"],
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
        },
        rules: {
            // A few sensible code-quality/style nudges
            curly: "warn",
            eqeqeq: "warn",
            semi: ["warn", "always"],
            "no-throw-literal": "warn",
        },
    },
];