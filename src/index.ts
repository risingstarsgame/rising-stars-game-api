import { ApiException, fromHono } from "chanfana";
import { Hono, Context, Next } from "hono";
import { recordsRouter } from "./endpoints/records/router";
import { modelExportsRouter } from "./endpoints/model_exports/router";
import { ContentfulStatusCode } from "hono/utils/http-status";

const app = new Hono<{ Bindings: Env }>();

// ----- API Key Middleware -----
const authMiddleware = async (context: Context, next: Next) => {
  const apiKey = context.req.header('authorization');
  const expectedKey = context.env.RISING_STARS_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return context.json(
      { success: false, errors: [{ code: 401, message: "Unauthorized: Invalid or missing API key" }] },
      401
    );
  }
  await next();
};

app.use('/exports/*', authMiddleware);
app.use('/records/*', authMiddleware);

// ----- Error handler -----
app.onError((err: any, context: Context) => {
  if (err instanceof ApiException) {
    return context.json(
      { success: false, errors: err.buildResponse() },
      err.status as ContentfulStatusCode,
    );
  }
  console.error("Global error handler caught:", err);
  return context.json(
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
      version: "1.0.5",
      description: "API for storing and retrieving Roblox model exports (KV) and performance recordings (D1)",
    },
  },
});

// ----- Register routes -----
openapi.route("/exports", modelExportsRouter);
openapi.route("/records", recordsRouter);

export default app;