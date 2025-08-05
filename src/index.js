import { createServer } from "node:http";
import { join } from "node:path";
import { hostname } from "node:os";
import wisp from "wisp-server-node";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import next from "next";

// UV static paths
import { publicPath } from "static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const fastify = Fastify({
  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        handler(req, res);
      })
      .on("upgrade", (req, socket, head) => {
        if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
        else socket.end();
      });
  },
});

(async () => {
  console.log("🚀 Initializing Fastify + Next.js");

  // Prepare Next.js app
  const nextApp = next({
    dev: false,
    dir: join(process.cwd(), "frontend"),
  });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  // Static file registrations with specific prefixes
  fastify.register(fastifyStatic, {
    root: publicPath,
    prefix: "/static/",
    decorateReply: true,
  });

  fastify.register(fastifyStatic, {
    root: uvPath,
    prefix: "/uv/",
    decorateReply: false,
  });

  fastify.register(fastifyStatic, {
    root: epoxyPath,
    prefix: "/epoxy/",
    decorateReply: false,
  });

  fastify.register(fastifyStatic, {
    root: baremuxPath,
    prefix: "/baremux/",
    decorateReply: false,
  });

  // uv.config.js manual handler
  fastify.get("/uv/uv.config.js", (req, res) => {
    return res.sendFile("uv/uv.config.js", publicPath);
  });

  // Fallback to Next.js for everything else
  fastify.setNotFoundHandler((req, res) => {
    handle(req.raw, res.raw).then(() => {
      res.sent = true;
    });
  });

  // Start the server
  const port = parseInt(process.env.PORT || "8080");
  fastify.listen({ port, host: "0.0.0.0" }, (err) => {
    if (err) {
      console.error("❌ Failed to start server:", err);
      process.exit(1);
    }

    const address = fastify.server.address();
    console.log("✅ Server is listening on:");
    console.log(`→ http://localhost:${address.port}`);
    console.log(`→ http://${hostname()}:${address.port}`);
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("SIGINT received. Shutting down...");
    fastify.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down...");
    fastify.close();
    process.exit(0);
  });
})();
