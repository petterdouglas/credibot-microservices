import http from "node:http";

const port = Number(process.env.PORT ?? 3001);

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/health") {
    res.writeHead(200);
    res.end(JSON.stringify({ status: "UP", service: "web-bff" }));
    return;
  }
  res.writeHead(200);
  res.end(JSON.stringify({ service: "web-bff", version: "0.1.0" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`web-bff listening on 0.0.0.0:${port}`);
});
