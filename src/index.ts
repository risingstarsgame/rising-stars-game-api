import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { modelExportsRouter } from "./endpoints/model_exports/router";
import { ContentfulStatusCode } from "hono/utils/http-status";

const app = new Hono<{ Bindings: Env }>();

// ----- API Key Middleware -----
app.use('/exports/*', async (c, next) => {
  const apiKey = c.req.header('authorization');
  const expectedKey = c.env.RISING_STARS_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json(
      { success: false, errors: [{ code: 401, message: "Unauthorized: Invalid or missing API key" }] },
      401
    );
  }
  await next();
});

// ----- Error handler -----
app.onError((err: any, c: any) => {
  if (err instanceof ApiException) {
    return c.json(
      { success: false, errors: err.buildResponse() },
      err.status as ContentfulStatusCode,
    );
  }
  console.error("Global error handler caught:", err);
  return c.json(
    { success: false, errors: [{ code: 7000, message: "Internal Server Error" }] },
    500,
  );
});

// ----- OpenAPI setup -----
const openapi = fromHono(app, {
  docs_url: "/",
  schema: {
    info: {
      title: "Rising Stars Roblox API",
      version: "1.0.3",
      description: "API for storing and retrieving Roblox model exports with 24-hour TTL using Workers KV",
    },
  },
});

// ----- Register KV routes  -----
openapi.route("/exports", modelExportsRouter);

export default app;