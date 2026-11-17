import http from "node:http";

const port = Number(process.env.PORT ?? 3003);

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/health") {
    res.writeHead(200);
    res.end(JSON.stringify({ status: "UP", service: "ai-assistant-service" }));
    return;
  }
  res.writeHead(200);
  res.end(JSON.stringify({ service: "ai-assistant-service", version: "0.1.0" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`ai-assistant-service listening on 0.0.0.0:${port}`);
});
