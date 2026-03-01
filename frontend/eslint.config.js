import baseConfig from "./Code/eslint.config.js"

export default [
  ...baseConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": [
        "error",
        { allowConstantExport: true },
      ],
    },
  },
]
