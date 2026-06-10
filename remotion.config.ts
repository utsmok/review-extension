import { Config } from "@remotion/cli/config";
import path from "node:path";

const ROOT = process.cwd();
const MOCKS = path.join(ROOT, "remotion/mocks");

Config.overrideWebpackConfig((config) => {
  const existingAlias =
    typeof config.resolve?.alias === "object" && !Array.isArray(config.resolve?.alias)
      ? (config.resolve.alias as Record<string, string>)
      : {};

  // Find existing CSS rules and inject PostCSS into them
  const rules = (config.module?.rules ?? []).map((rule) => {
    if (
      typeof rule === "object" &&
      rule != null &&
      "test" in rule &&
      rule.test instanceof RegExp &&
      rule.test.source.includes("css")
    ) {
      const ruleObj = rule as Record<string, unknown>;
      // Found a CSS rule — inject postcss-loader before css-loader
      const use = Array.isArray(ruleObj.use) ? [...ruleObj.use] : ruleObj.use ? [ruleObj.use] : [];
      return {
        ...ruleObj,
        use: use.flatMap((loader) => {
          if (typeof loader === "string" && loader.includes("css-loader")) {
            return [
              loader,
              {
                loader: "postcss-loader",
                options: {
                  postcssOptions: {
                    config: path.join(ROOT, "postcss.config.js"),
                  },
                },
              },
            ];
          }
          return loader;
        }),
      };
    }
    return rule;
  });

  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...existingAlias,
        "@/lib/capture": path.join(MOCKS, "capture.ts"),
        "@/lib/session-lifecycle": path.join(MOCKS, "session-lifecycle.ts"),
        "@/lib/auto-save": path.join(MOCKS, "session-lifecycle.ts"),
        "@/lib/export": path.join(MOCKS, "export.ts"),
        "@": ROOT,
      },
    },
    module: {
      ...config.module,
      rules,
    },
  };
});
