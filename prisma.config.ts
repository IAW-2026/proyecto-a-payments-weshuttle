import { defineConfig } from "@prisma/config";

export default defineConfig({
  earlyAccess: true,
  seed: {
    command: "npx tsx prisma/seed.ts",
  },
});
