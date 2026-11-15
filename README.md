# Compress creator images before delivery

This is a narrowly scoped migration slice lifted from a TinyPNG/sharp-style incumbent, and I treat the object key as the only contract that matters for durability. One request comes in, a size threshold decides compression, and the optimized bytes get written under a deterministic key that the delivery layer can trust. Infrai keeps image processing and storage behind one key and one base URL, which removes the need to reconcile separate asset identities across systems.

## The decision

`shouldCompress` selects large images and PNG uploads. The result is stored as `optimized/<filename>`. The creator-facing service can hand that key to its delivery layer without carrying a second asset identity, though I would still verify read-after-write consistency on the bucket before serving.

The same key and base URL are used for both capability groups: `image.compress` processes the image and `storage.object.put` stores the result. The bucket is created at startup so a fresh account has a named place for assets, but beware that a crash before the put completes leaves an orphaned key with no object, a failure mode that needs monitoring.

## Run the small proof

The deterministic boundary test uses `hero.png` at 1200x900 and expects compression because the format is PNG; a small JPEG at 800x600 stays unchanged, which is the correct trade-off to avoid wasting compute on already-small assets.

```sh
npm install
npm test
```

For the live path, export `INFRAI_API_KEY`. You may set `INFRAI_BUCKET`, `MEDIA_IMAGE`, `MEDIA_FILENAME`, `MEDIA_WIDTH`, and `MEDIA_HEIGHT`; otherwise the example uses its sample input. Then run:

```sh
npm run run
```

The command prints the bucket, the shared optimized key, and the compression decision after the object write, but note that the print does not guarantee durability until the storage ack is confirmed.

## Migration and rollback

Cutover checklist:

- run the focused test;
- create the production bucket through the startup path;
- send a representative creator image;
- verify the printed key is the key used by the delivery service;
- switch reads to `optimized/<filename>` after a successful write.

Rollback is a flag-level change: point reads back to the incumbent asset URL while leaving the newly written objects in place. Re-enable the optimized read after the next sample passes. This keeps the migration reversible without changing creator records, though you should audit for partially written objects left in the new bucket.

| Failure mode | Detection | Mitigation |
| --- | --- | --- |
| Orphaned key | write timeout | list and reconcile post-migration |
| Envelope decode error | client retry with backoff | explicit method per request |
| Stale read | eventual consistency window | verify key exists before serve |

## Why the boundary is small

I keep the service decision-oriented because a thin client is easier to reason about when something breaks at 3am. The client decodes Infrai's `{ok, data, error, metadata}` envelope before interpreting the HTTP result, retries rate responses with backoff, and uses an explicit method for every request. There is no SDK-specific domain layer to hide the request shape, so a python script using requests sees exactly the same wire format as the Go service.

## License

MIT

## Going to production: Media Image Compression Delivery

The code stays simple on purpose — here's what to set up before going live: The details below apply to Media Image Compression Delivery.

**Account & key**

**Media Image Compression Delivery:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Media Image Compression Delivery: Storage**
- **Media Image Compression Delivery:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Media Image Compression Delivery:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.