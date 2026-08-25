import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// เทสต์ logic ล้วน (money, slots, status) — environment: node, resolve alias "@" = root
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // "server-only" throw นอก RSC → แทนด้วยสตับว่างเพื่อเทสต์ pure funcs ใน lib server
      "server-only": fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
