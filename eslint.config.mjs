import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next*/**",
      ".capacitor-build/**",
      "mobile-dist/**",
      ".ios-derived/**",
      ".ios-archives/**",
      "ios/DerivedData/**",
      "ios/App/App/public/**",
      "node_modules/**",
      "native-plugins/**/dist/**",
      "public/sw.js",
      ".data/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // These React Compiler rules are new in eslint-config-next 16. The app is
      // currently on Next 15 and will adopt them during its framework upgrade.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default eslintConfig;
