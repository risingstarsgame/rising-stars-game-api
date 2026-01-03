import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { modelExportsRouter } from "./endpoints/model_exports/router";
import { ContentfulStatusCode } from "hono/utils/http-status";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.onError((err: any, c: any) => {
    if (err instanceof ApiException) {
        // If it's a Chanfana ApiException, let Chanfana handle the response
        return c.json(
            { success: false, errors: err.buildResponse() },
            err.status as ContentfulStatusCode,
        );
    }

    console.error("Global error handler caught:", err); // Log the error if it's not known

    // For other errors, return a generic 500 response
    return c.json(
        {
            success: false,
            errors: [{ code: 7000, message: "Internal Server Error" }],
        },
        500,
    );
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
    docs_url: "/",
    schema: {
        info: {
            title: "Roblox Model Export API",
            version: "1.0.0",
            description: "API for storing and retrieving Roblox model exports with 24-hour TTL",
        },
    },
});

// Register Model Exports router
openapi.route("/exports", modelExportsRouter);

// Export the Hono app
export default app;
