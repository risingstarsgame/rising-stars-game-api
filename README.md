# Rising Stars Game API

This Cloudflare Worker provides the backend for the Roblox game **Rising Stars**. It uses OpenAPI 3.1 auto-generation and validation via [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://hono.dev).

The project includes two main data storage systems:

- **Model exports** stored in Workers KV with a 24-hour TTL.
- **Performance records** stored in D1 (SQLite) as gzip-compressed MessagePack blobs.

The API is protected by an API key middleware. All endpoints return consistent error structures with custom error codes.

---

## Project Structure

```
src/index.ts                                         – Main router, OpenAPI configuration, error handler, API key middleware, cron handler.
src/endpoints/model_exports/                         – KV-based endpoints for model exports.
src/endpoints/records/                               – D1-based endpoints for performance records.
src/scheduled/cleanupExpiredSoftDeletedRecords.ts    – Cron job that hard-deletes expired soft-deleted records.
src/utils/compression.ts                             – Gzip decompression utilities.
migrations/                                          – SQL migrations for the D1 database.
tests/                                               – Integration tests using Vitest.
```

---

## Endpoints

### Model Exports (KV)

| Method | Endpoint                   | Description                                                                                                     |
|--------|----------------------------|-----------------------------------------------------------------------------------------------------------------|
| `POST` | `/exports`                 | Create a new model export. Requires `id`, `user_id`, `serialized_data`. Returns success and the created object. |
| `GET`  | `/exports/import/:id`      | Retrieve a model export by `id`. Returns `404` if not found or expired.                                         |
| `PUT`  | `/exports/:id`             | Update `serialized_data` if not expired. Returns updated object or expired flag.                                |
| `GET`  | `/exports/player/:user_id` | List all non-expired exports for a player, automatically deleting expired ones.                                 |

### Performance Records (D1)

| Method    | Endpoint                          | Description                                                                                                                                                   |
|-----------|-----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `POST`    | `/records`                        | Store a new record. Body must be a gzip-compressed MessagePack blob. Metadata is passed via custom request headers. Returns `{ success: true }` on success.   |
| `GET`     | `/records/:record_id`             | Retrieve a record. Decompresses and decodes the stored blob server-side, returning a JSON object. Returns `404` if not found, `410` if soft-deleted, `500` on decompression failure. |
| `DELETE`  | `/records/:record_id`             | Hard-delete a record permanently. Returns `{ success: true }` on success.                                                                                     |
| `PATCH`   | `/records/:record_id/soft-delete` | Soft-delete a record by setting `deleted = 1` and recording a `deletion_date`. Returns `404` if not found or already deleted.                                 |
| `PATCH`   | `/records/:record_id/restore`     | Restore a soft-deleted record by clearing `deleted` and `deletion_date`. Returns `404` if not found or not deleted.                                           |

#### `POST /records` — Request Headers

| Header              | Type                  | Description                       |
|---------------------|-----------------------|-----------------------------------|
| `Content-Type`      | `application/msgpack` | Body encoding format              |
| `Content-Encoding`  | `gzip`                | Body compression                  |
| `X-Record-Id`       | string                | Unique record identifier          |
| `X-Performance-Id`  | string                | Associated performance identifier |
| `X-User-Id`         | number                | User who owns the record          |
| `X-Outfit-Id`       | number (optional)     | Outfit worn during the record     |
| `X-Frame-Count`     | number                | Total number of frames            |
| `X-Record-Duration` | number                | Duration in seconds               |

---

## Data Schemas

### Model Export (KV)

```json
{
  "id": "string (client-provided)",
  "user_id": "number",
  "serialized_data": "string (arbitrary JSON)",
  "created_at": "ISO datetime"
}
```

### Performance Record (D1)

Records are stored as gzip-compressed MessagePack blobs and returned as JSON after server-side decompression.

**Top-level fields:**

| Field                | Type              | Description                                                                            |
|----------------------|-------------------|----------------------------------------------------------------------------------------|
| `record_id`          | string            | Primary key                                                                            |
| `performance_id`     | string            |                                                                                        |
| `user_id`            | number            |                                                                                        |
| `outfit_id`          | number (optional) |                                                                                        |
| `frame_count`        | number            |                                                                                        |
| `record_duration`    | number            | Duration in seconds                                                                    |
| `frame_interval_map` | array of numbers  |                                                                                        |
| `animation_tracks`   | array of strings  |                                                                                        |
| `deleted`            | number            | `0` = active, `1` = soft-deleted                                                       |
| `deletion_date`      | string (optional) | ISO datetime set when the record is soft-deleted; cleared on restore                   |
| `created_at`         | string            | ISO datetime                                                                           |

**`frames` field** — array of objects with the following structure:

| Field             | Type               | Description                                |
|-------------------|--------------------|--------------------------------------------|
| `animation_id`    | number (optional)  |                                            |
| `animation_speed` | string (optional)  |                                            |
| `emote_playing`   | boolean (optional) |                                            |
| `frame_interval`  | number             | Index into `frame_interval_map`            |
| `hrp_relative_cf` | object             | Contains `pos` and `rot` arrays of strings |
| `player_message`  | string (optional)  |                                            |

---

## Soft Deletion & Cron Cleanup

Records support a two-phase deletion model:

1. **Soft delete** (`PATCH /records/:record_id/soft-delete`) — marks the record as deleted (`deleted = 1`) and records a `deletion_date`. The record is no longer returned by `GET /records/:record_id` (returns `410 Gone`), but remains in the database.
2. **Restore** (`PATCH /records/:record_id/restore`) — clears the `deleted` flag and `deletion_date`, making the record active again.
3. **Hard delete (cron)** — a daily cron trigger (configured in `wrangler.jsonc` as `"0 0 * * *"`) runs `cleanupExpiredSoftDeletedRecords`, which permanently deletes any record where `deleted = 1` and `deletion_date` is older than `RECORD_SOFT_DELETE_TTL_DAYS` days (defaults to 10).

---

## Technology Stack

| Layer               | Technology                                         |
|---------------------|----------------------------------------------------|
| Runtime             | Cloudflare Workers                                 |
| Web framework       | Hono                                               |
| OpenAPI integration | chanfana                                           |
| Validation          | Zod                                                |
| Database            | Cloudflare D1 (SQLite)                             |
| Key-value store     | Cloudflare Workers KV                              |
| Serialization       | MessagePack (`@msgpack/msgpack`)                   |
| Compression         | Native `CompressionStream` / `DecompressionStream` |
| Testing             | Vitest with `@cloudflare/vitest-pool-workers`      |

---

## Setup for Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a D1 database and KV namespace. Update `wrangler.jsonc` with the generated IDs.

3. Apply migrations:

   ```bash
   npx wrangler d1 migrations apply DB --local
   ```

4. Set the API key secret:

   ```bash
   npx wrangler secret put RISING_STARS_API_KEY
   ```

5. (Optional) Set the soft-delete TTL in days (defaults to `10` if not set):

   ```bash
   npx wrangler secret put RECORD_SOFT_DELETE_TTL_DAYS
   ```

6. Run locally:

   ```bash
   npm run dev
   ```

---

## Deployment

The project is deployed to a private Cloudflare Workers account. After configuring environment variables and bindings, deploy with:

```bash
npm run deploy
```

The cron trigger (`0 0 * * *`) is registered in `wrangler.jsonc` and runs automatically once deployed.

---

## Testing

Run integration tests with:

```bash
npm run test
```

Tests use a local D1 instance with migrations applied automatically.

---

## Error Handling

All errors follow this structure:

```json
{
  "success": false,
  "errors": [
    {
      "code": 4041,
      "message": "Record not found"
    }
  ]
}
```

**Custom error codes:**

| Code   | Description                                          |
|--------|------------------------------------------------------|
| `400`  | Validation or malformed request                      |
| `401`  | Missing or invalid API key                           |
| `4041` | Resource not found (record or export)                |
| `4101` | Record has been soft-deleted                         |
| `409`  | Duplicate ID                                         |
| `5000` | Internal server error (D1 or KV failure)             |
| `5002` | Failed to decompress or decode record data           |
| `7000` | Unhandled exception                                  |

---

## OpenAPI Documentation

The OpenAPI 3.1 schema is automatically generated and served at the root URL (`/`). To generate a local copy, run:

```bash
npm run schema
```