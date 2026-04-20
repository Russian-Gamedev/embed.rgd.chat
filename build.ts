import { $ } from "bun";

const result = await Bun.build({
  entrypoints: ["src/main.ts"],
  compile: {
    outfile: "./dist/app",
    autoloadPackageJson: true,
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

if (result.success) {
  console.log("Build successful!");
} else {
  console.error("Build failed:", result.logs);
  process.exit(1);
}

export {};
