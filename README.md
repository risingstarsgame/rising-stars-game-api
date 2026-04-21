# Rising Stars Game API

This Cloudflare Worker provides the backend for the Roblox game **Rising Stars**. It uses OpenAPI 3.1 auto-generation and validation via [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://hono.dev).

The project includes two main data storage systems:

- **Model exports** stored in Workers KV with a 24-hour TTL.
- **Performance recordings** stored in D1 (SQLite) as gzip-compressed MessagePack blobs.

The API is protected by an API key middleware. All endpoints return consistent error structures with custom error codes.

---

## Project Structure

```
src/index.ts                    – Main router, OpenAPI configuration, error handler, API key middleware.
src/endpoints/model_exports/    – KV-based endpoints for model exports.
src/endpoints/records/          – D1-based endpoints for performance recordings.
src/utils/compression.ts        – Gzip decompression utilities.
migrations/                     – SQL migrations for the D1 database.
tests/                          – Integration tests using Vitest.
```

---

## Endpoints

### Model Exports (KV)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/exports` | Create a new model export. Requires `id`, `user_id`, `serialized_data`. Returns success and the created object. |
| `GET` | `/exports/import/:id` | Retrieve a model export by `id`. Returns `404` if not found or expired. |
| `PUT` | `/exports/:id` | Update `serialized_data` if not expired. Returns updated object or expired flag. |
| `GET` | `/exports/player/:user_id` | List all non-expired exports for a player, automatically deleting expired ones. |

### Performance Recordings (D1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/records` | Store a new recording. Body must be a gzip-compressed MessagePack blob (`Content-Type: application/msgpack`, `Content-Encoding: gzip`). Metadata is passed via custom headers. Returns `{ success: true }` on success. |
| `GET` | `/records/:record_id` | Retrieve a recording. Decompresses and decodes the MessagePack blob before returning. Returns `404` if not found. |
| `DELETE` | `/records/:record_id` | Delete a recording. Returns `{ success: true }` on success. |

#### `POST /records` — Required Headers

| Header | Type | Description |
|--------|------|-------------|
| `Content-Type` | `application/msgpack` | Body encoding format |
| `Content-Encoding` | `gzip` | Body compression |
| `X-Record-Id` | string | Unique record identifier |
| `X-Performance-Id` | string | Associated performance identifier |
| `X-User-Id` | number | User who owns the record |
| `X-Outfit-Id` | number (optional) | Outfit worn during the recording |
| `X-Frame-Count` | number | Total number of frames |
| `X-Record-Duration` | number | Duration in seconds |

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

### Performance Recording (D1)

**Top-level fields:**

| Field | Type | Description |
|-------|------|-------------|
| `record_id` | string | Primary key |
| `performance_id` | string | |
| `user_id` | number | |
| `outfit_id` | number (optional) | |
| `frame_count` | number | |
| `record_duration` | number | Duration in seconds |
| `animation_tracks` | array of strings | |
| `frame_interval_map` | array of numbers | |
| `frame_times` | array of numbers | |
| `created_at` | string | ISO datetime |

**`frames` field** — array of objects with the following structure:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | |
| `time` | number | |
| `animationId` | number (optional) | |
| `animationSpeed` | string (optional) | |
| `emotePlaying` | boolean (optional) | |
| `frameInterval` | number | Index into `frame_interval_map` |
| `hrpRelativeCF` | object | Contains `pos` and `rot` arrays of strings |
| `playerMessage` | string (optional) | |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers |
| Web framework | Hono |
| OpenAPI integration | chanfana |
| Validation | Zod |
| Database | Cloudflare D1 (SQLite) |
| Key-value store | Cloudflare Workers KV |
| Serialization | MessagePack (`@msgpack/msgpack`) |
| Compression | Native `CompressionStream` / `DecompressionStream` |
| Testing | Vitest with `@cloudflare/vitest-pool-workers` |

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

5. Run locally:
   ```bash
   npm run dev
   ```

---

## Deployment

The project is deployed to a private Cloudflare Workers account. After configuring environment variables and bindings, deploy with:

```bash
npm run deploy
```

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

| Code | Description |
|------|-------------|
| `400` | Validation or malformed request |
| `401` | Missing or invalid API key |
| `4041` | Resource not found (record or export) |
| `409` | Duplicate ID |
| `5000` | Internal server error (D1 or KV failure) |
| `5002` | Failed to decompress or decode record blob |
| `7000` | Unhandled exception |

---

## OpenAPI Documentation

The OpenAPI 3.1 schema is automatically generated and served at the root URL (`/`). To generate a local copy, run:

```bash
npm run schema
```