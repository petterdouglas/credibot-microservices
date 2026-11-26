import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      // Em dev sem mock, repassa /web/* para o gateway do docker-compose
      proxy: { "/web": env.VITE_GATEWAY_URL || "http://localhost:8080" },
    },
  };
});
