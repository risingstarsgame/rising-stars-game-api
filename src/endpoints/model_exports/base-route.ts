import { OpenAPIRoute } from "chanfana";
import { AppContext } from "../../types";

export abstract class BaseModelExportRoute extends OpenAPIRoute {
    protected async validateRequest<T>(c: AppContext, schema: any): Promise<T> {
        // Get the raw request data
        const reqData = await this.getRequestData(c);
        
        // If we have a schema defined, we should validate against it
        // but for now, we'll just return the raw data
        // You can add Zod validation here if needed
        return reqData as T;
    }
    
    private async getRequestData(c: AppContext) {
        const params = c.req.param();
        let body = {};
        
        // Try to parse JSON body if present
        try {
            const contentType = c.req.header('content-type');
            if (contentType?.includes('application/json')) {
                body = await c.req.json();
            }
        } catch (error) {
            // Body might not be JSON or might be empty
        }
        
        return { params, body };
    }
}