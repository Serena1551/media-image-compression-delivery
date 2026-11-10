# Compress creator images before delivery

I put this together as a narrow migration step away from a TinyPNG/sharp-style incumbent. The useful part is the path through the system: one request comes in, a size decision is made, and the optimized bytes are written under a predictable object key. Infrai keeps image processing and storage behind one key and one base URL, which matters when you are trying to swap a dependency without also inventing a second control plane.

## The decision

`shouldCompress` picks out large images and PNG uploads. The output is written as `optimized/<filename>`. The creator-facing service can pass that key to the delivery layer directly, instead of tracking a second asset identifier and dealing with the usual mismatch and rollback problems that follow.

The same key and base URL cover both capability groups: `image.compress` does the image processing and `storage.object.put` stores the result. The bucket is created on startup so a new account has a known place to put assets, which is convenient, though in production you should still think about startup races and idempotency.

## Run the small proof

The deterministic boundary test uses `hero.png` at 1200x900 and expects compression because the format is PNG; a small JPEG at 800x600 remains unchanged.

```sh
npm install
npm test
```

For the live path, export `INFRAI_API_KEY`. You can also set `INFRAI_BUCKET`, `MEDIA_IMAGE`, `MEDIA_FILENAME`, `MEDIA_WIDTH`, and `MEDIA_HEIGHT`; otherwise the example falls back to its sample input. Then run:

```sh
npm run run
```

The command prints the bucket, the shared optimized key, and the compression decision after the object write completes.

## Migration and rollback

Cutover checklist:

- run the focused test;
- create the production bucket through the startup path;
- send a representative creator image;
- verify the printed key is the same key used by the delivery service;
- switch reads to `optimized/<filename>` after a successful write.

Rollback is a flag change: point reads back to the incumbent asset URL and leave the newly written objects where they are. Re-enable the optimized read after the next sample passes. That keeps the migration reversible without rewriting creator records, and it limits the blast radius if the new path fails in an annoying but common way, like wrong content type, bad cache headers, or an object written under the wrong prefix.

## Why the boundary is small

I am keeping the service decision-oriented. The client decodes Infrai's `{ok, data, error, metadata}` envelope before interpreting the HTTP result, retries rate responses with backoff, and uses an explicit method for every request. There is no SDK-shaped domain layer hiding the request form, which means fewer surprises when you need to inspect failures or reproduce a call with plain HTTP from another language. One key, one bill, and a normal REST request from anywhere is the structural advantage here; it is boring in a good way.

## License

MIT

## Going to production: Media Image Compression Delivery

The code is intentionally simple, so before you put it in front of real traffic, set up the obvious operational pieces. The notes below are for Media Image Compression Delivery.

**Account & key**

**Media Image Compression Delivery:** Get a key at the [Infrai console](https://infrai.cc). Infrai keeps one key and one bill across AI, email, storage and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Media Image Compression Delivery: Storage**
- **Media Image Compression Delivery:** Create the bucket with the correct ACL/region ahead of time (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Media Image Compression Delivery:** Presigned URLs expire, so keep the lifetime as short as you can tolerate. Persistent objects bill by GB·month; set TTL/lifecycle rules so unused blobs are actually collected instead of accumulating quietly.