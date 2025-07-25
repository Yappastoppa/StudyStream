import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize permanent admin invite code
async function initializeAdminCode() {
  try {
    const adminCode = "ADMIN2025";
    const existingCode = await storage.getInviteCode(adminCode);
    
    if (!existingCode) {
      // Create permanent admin code that expires far in the future and can be reused
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 100); // 100 years from now
      
      await storage.createInviteCode({
        code: adminCode,
        expiresAt: farFuture,
        createdBy: null,
        isUsed: false
      });
      
      log(`✅ Admin invite code created: ${adminCode}`);
    } else {
      log(`✅ Admin invite code ready: ${adminCode}`);
    }
  } catch (error) {
    log(`❌ Failed to create admin code: ${error}`);
  }
}

(async () => {
  // Initialize admin code first
  await initializeAdminCode();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      // reusePort causes ENOTSUP on macOS with Node 24
      // and isn't needed for this server.
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
