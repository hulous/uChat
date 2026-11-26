const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const angularPlugin = require("@angular-eslint/eslint-plugin");
const angularTemplatePlugin = require("@angular-eslint/eslint-plugin-template");
const angularTemplateParser = require("@angular-eslint/template-parser");
const prettierConfig = require("eslint-plugin-prettier/recommended");

module.exports = [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "src/index.html"],
  },
  ...tsPlugin.configs["flat/recommended"],
  prettierConfig,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        createDefaultProgram: true,
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    plugins: {
      "@angular-eslint": angularPlugin,
      prettier: require("eslint-plugin-prettier"),
    },
    rules: {
      "prettier/prettier": "error",
      "@angular-eslint/prefer-inject": "off",
      "@angular-eslint/no-empty-lifecycle-method": "warn",
      "@angular-eslint/use-lifecycle-interface": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.html"],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      "@angular-eslint/template": angularTemplatePlugin,
      prettier: require("eslint-plugin-prettier"),
    },
    rules: {
      "prettier/prettier": ["error", { parser: "angular" }],
    },
  },
];
