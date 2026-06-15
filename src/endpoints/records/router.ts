import { Hono } from 'hono';
import { fromHono } from 'chanfana';
import { CreateRecord } from './createRecord';
import { GetRecord } from './getRecord';
import { DeleteRecord } from './deleteRecord';
import { SoftDeleteRecord } from './softDeleteRecord';
import { RestoreRecord } from './restoreRecord';

export const recordsRouter = fromHono(new Hono());

recordsRouter.post('/', CreateRecord);
recordsRouter.get('/:record_id', GetRecord);
recordsRouter.delete('/:record_id', DeleteRecord);
recordsRouter.patch('/:record_id/soft-delete', SoftDeleteRecord);
recordsRouter.patch('/:record_id/restore', RestoreRecord);