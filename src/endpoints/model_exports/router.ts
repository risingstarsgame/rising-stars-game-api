import { Hono } from "hono";
import { fromHono } from "chanfana";
import { CreateModelExport } from "./createModelExport";
import { ImportModel } from "./importModel";
import { UpdateModelExport } from "./updateModelExport";

export const modelExportsRouter = fromHono(new Hono());

modelExportsRouter.post("/", CreateModelExport);
modelExportsRouter.get("/import/:id", ImportModel);
modelExportsRouter.put("/:id", UpdateModelExport);