import { FlatCompat } from "@eslint/eslintrc";
import { globalIgnores } from "eslint/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [...compat.extends("next/core-web-vitals", "next/typescript")];

const eslintConfig = [
  globalIgnores([".next/**", ".next-build/**", "node_modules/**", "next-env.d.ts"]),
  ...config,
];

export default eslintConfig;
