import { Hono } from "hono";
import { fromHono } from "chanfana";
import { GetAllPlayerExportedModels } from "./getAllPlayerModels";
import { CreateModelExport } from "./createModelExport";
import { ImportModel } from "./importModel";
import { UpdateModelExport } from "./updateModelExport";

export const modelExportsRouter = fromHono(new Hono());

modelExportsRouter.get("/player/:player_user_id", GetAllPlayerExportedModels);
modelExportsRouter.post("/", CreateModelExport);
modelExportsRouter.get("/import/:id/:player_user_id", ImportModel);
modelExportsRouter.put("/:id", UpdateModelExport);