import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { modelExportsRouter } from "./endpoints/model_exports/router";
import { ContentfulStatusCode } from "hono/utils/http-status";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

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

const openapi = fromHono(app, {
    docs_url: "/",
    schema: {
        info: {
            title: "Roblox Model Export API",
            version: "1.0.1",
            description: "API for storing and retrieving Roblox model exports with 24-hour TTL using Workers KV",
        },
    },
});

openapi.route("/exports", modelExportsRouter);

export default app;