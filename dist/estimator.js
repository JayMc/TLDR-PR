import { getEncoding } from "js-tiktoken";
export function estimator(string) {
    // gpt-4o-mini
    const enc = getEncoding("o200k_base");
    const tokens = enc.encode(string);
    return tokens;
}
