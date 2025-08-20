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
        // Essential mobile compatibility headers
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        
        // Handle OPTIONS preflight requests
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
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

  // Mobile debugging endpoint
  fastify.get("/health", (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    return res.send({
      status: "ok",
      timestamp: new Date().toISOString(),
      mobile: isMobile,
      userAgent: userAgent,
      serviceWorkerSupport: req.headers['sec-fetch-dest'] !== undefined,
      protocol: req.protocol || 'http',
      host: req.headers.host
    });
  });

  // Service worker test page
  fastify.get("/test-sw", (req, res) => {
    const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Service Worker Test</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
    </style>
</head>
<body>
    <h1>Service Worker Test</h1>
    <div id="result"></div>
    <script>
        const resultDiv = document.getElementById('result');
        
        function addStatus(message, type = 'info') {
            const div = document.createElement('div');
            div.className = 'status ' + type;
            div.innerHTML = message;
            resultDiv.appendChild(div);
        }
        
        if ('serviceWorker' in navigator) {
            addStatus('✅ Service Worker supported', 'success');
            
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(registration => {
                    addStatus('✅ Service Worker registered successfully', 'success');
                    addStatus('Scope: ' + registration.scope, 'info');
                    
                    return navigator.serviceWorker.ready;
                })
                .then(registration => {
                    addStatus('✅ Service Worker is ready', 'success');
                    addStatus('State: ' + registration.active.state, 'info');
                })
                .catch(error => {
                    addStatus('❌ Service Worker registration failed: ' + error.message, 'error');
                    console.error('SW registration error:', error);
                });
        } else {
            addStatus('❌ Service Worker not supported in this browser', 'error');
        }
        
        // Device info
        addStatus('User Agent: ' + navigator.userAgent, 'info');
        addStatus('Protocol: ' + location.protocol, 'info');
        addStatus('Host: ' + location.host, 'info');
        
        // Check if mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        addStatus('Mobile Device: ' + (isMobile ? 'Yes' : 'No'), 'info');
    </script>
</body>
</html>`;
    
    return res.type('text/html').send(testHtml);
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
    console.log("🔧 Mobile debugging endpoints:");
    console.log(`→ http://localhost:${address.port}/health`);
    console.log(`→ http://localhost:${address.port}/test-sw`);
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