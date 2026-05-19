# Update 6 — Object Storage for Documents

This update adds a production object-storage provider for uploaded and generated documents.

## Why

The previous production fallback stored document bytes in Postgres. That is durable, but it is expensive and slow at scale because every document download pulls a full bytea row through the application server.

This update keeps the old providers, but adds:

- `DOCUMENT_STORAGE_PROVIDER=s3`
- AWS S3 support
- Cloudflare R2 support
- MinIO/S3-compatible support
- Object read/write/delete checks
- A migration helper for existing database/local documents

## Providers

```env
DOCUMENT_STORAGE_PROVIDER="local"     # local development only
DOCUMENT_STORAGE_PROVIDER="database"  # durable fallback, not preferred at scale
DOCUMENT_STORAGE_PROVIDER="s3"        # recommended production setting
```

## Required S3/R2 variables

```env
DOCUMENT_STORAGE_PROVIDER="s3"
DOCUMENT_S3_BUCKET="homebase-documents"
DOCUMENT_S3_REGION="auto"
DOCUMENT_S3_ENDPOINT="https://ACCOUNT_ID.r2.cloudflarestorage.com"
DOCUMENT_S3_ACCESS_KEY_ID="..."
DOCUMENT_S3_SECRET_ACCESS_KEY="..."
DOCUMENT_S3_PREFIX="documents"
DOCUMENT_S3_FORCE_PATH_STYLE="false"
DOCUMENT_S3_SERVER_SIDE_ENCRYPTION="AES256"
```

For AWS S3, leave `DOCUMENT_S3_ENDPOINT` blank and set `DOCUMENT_S3_REGION` to your AWS region.

For Cloudflare R2, use `auto` for region and your R2 S3 API endpoint.

## Migration helper

After setting object-storage env vars, run:

```bash
npm run storage:migrate-to-object
```

The script reads existing `database:` or local documents, writes them through the active provider, updates `Document.storagePath`, and removes the old stored object after a successful update.

## Verification

```bash
npm run storage:verify
```

For `s3`, this performs a write/read/delete smoke test against the configured bucket.

## Notes

- Existing `database:` documents keep working until migrated.
- Existing local documents keep working until migrated.
- New uploads use the active provider immediately.
- Application downloads still flow through the authorized API route, so private documents are not exposed as public bucket URLs.
