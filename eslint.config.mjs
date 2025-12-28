import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        "admin-tools/legacy/**",
    ]),
    // Custom rule: Prohibited financial terms for legal compliance
    {
        rules: {
            "no-restricted-syntax": [
                "warn",
                {
                    selector: "Literal[value=/(?<!자문,\\s*)추천(?!.*제공하지)/]",
                    message: "⚠️ 법적 주의: '추천' 용어 사용 금지. '필터링' 또는 '조건 충족'으로 대체하세요."
                },
                {
                    selector: "Literal[value=/유망/]",
                    message: "⚠️ 법적 주의: '유망' 용어 사용 금지."
                },
                {
                    selector: "Literal[value=/기대수익/]",
                    message: "⚠️ 법적 주의: '기대수익' 용어 사용 금지."
                }
            ]
        }
    }
]);

export default eslintConfig;
