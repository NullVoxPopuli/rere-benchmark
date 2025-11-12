import { ember } from "ember-eslint";

export default [
  ...ember.recommended(import.meta.dirname),
  {
    name: "dont care",
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
];
