import { buildApp } from "./app";

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";

async function start(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
