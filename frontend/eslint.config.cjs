const { defineConfig, globalIgnores } = require("eslint/config");
const { FlatCompat } = require("@eslint/eslintrc");
const { fixupConfigRules } = require("@eslint/compat");
const globals = require("globals");
const espree = require("espree");
const tsParser = require("@typescript-eslint/parser");
const reactRefresh = require("eslint-plugin-react-refresh");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

module.exports = defineConfig([
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        plugins: {
            "react-refresh": reactRefresh,
        },
        extends: fixupConfigRules(
            compat.extends(
                "eslint:recommended",
                "plugin:react/recommended",
                "plugin:react-hooks/recommended",
                "plugin:jsx-a11y/recommended",
                "plugin:import/recommended",
            ),
        ),
        rules: {
            "react/jsx-uses-react": "off",
            "react/react-in-jsx-scope": "off",
            "react-hooks/set-state-in-effect": "off",
            "react-refresh/only-export-components": [
                "warn",
                {
                    allowConstantExport: true,
                },
            ],
        },
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: ["./tsconfig.eslint.json"],
                tsconfigRootDir: __dirname,
            },
        },
        extends: fixupConfigRules(
            compat.extends(
                "plugin:@typescript-eslint/recommended",
                "plugin:import/typescript",
            ),
        ),
        rules: {
            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports",
                    fixStyle: "inline-type-imports",
                },
            ],
            "@typescript-eslint/no-floating-promises": [
                "error",
                {
                    ignoreIIFE: true,
                },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": [
                "warn",
                {
                    ignoreRestArgs: true,
                },
            ],
            "@typescript-eslint/explicit-function-return-type": "off",
        },
    },
    {
        files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
        languageOptions: {
            parser: espree,
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/consistent-type-imports": "off",
        },
    },
    {
        files: [
            "**/*.config.{js,cjs,mjs,ts,cts,mts}",
            "**/scripts/**/*.{js,ts,cjs,mjs,cts,mts}",
        ],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    globalIgnores(["**/dist", "**/.eslintrc.cjs", "eslint.config.cjs"]),
]);
