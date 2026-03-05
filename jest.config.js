/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
    "^.+\\.mjs$": ["babel-jest", { presets: ["@babel/preset-env"] }],
  },
  transformIgnorePatterns: ["/node_modules/(?!(uuid|@uuid)/)"],
  testTimeout: 30000,
};
