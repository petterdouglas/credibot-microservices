import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3100,
      // Em dev sem mock, repassa /admin/* para o gateway do docker-compose
      proxy: { "/admin": env.VITE_GATEWAY_URL || "http://localhost:8080" },
    },
  };
});
