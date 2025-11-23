import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const tsRules = {
    ...tseslint.configs["recommended"].rules,
};

export default [
    {
        ignores: ["dist/**", "public/**", "node_modules/**"],
    },
    js.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                sourceType: "module",
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
                VITE_API_URL: "readonly",
                VITE_VAPID_PUBLIC_KEY: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...tsRules,
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "off",
            "react-refresh/only-export-components": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
        },
    },
];
