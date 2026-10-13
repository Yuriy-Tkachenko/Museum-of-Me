import { FlatCompat } from "@eslint/eslintrc";
import { globalIgnores } from "eslint/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [...compat.extends("next/core-web-vitals", "next/typescript")];

const eslintConfig = [
  globalIgnores([".next/**", ".next-build/**", "node_modules/**", "public/models/portrait/**", "next-env.d.ts", "playwright-report/**", "test-results/**", "supabase/.temp/**"]),
  ...config,
];

export default eslintConfig;
