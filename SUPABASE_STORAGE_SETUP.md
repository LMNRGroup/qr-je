# Supabase Storage RLS Policies Setup

## Bucket: `qr-assets` (PRIVATE)

The `qr-assets` bucket must be **private** (Dashboard > Storage > `qr-assets` > make sure "Public bucket" is **OFF**).

Files are never served directly from Supabase public URLs. Instead:

- **Uploads** go straight from the browser to Supabase using the anon key (allowed by the INSERT policy below).
- **Reads** go through the backend proxy: `GET {API_BASE_URL}/public/assets/{path}`.
  - The backend fetches the object with the service role key, so the bucket stays private.
  - Responses carry long-lived cache headers (`immutable`, 1-year edge cache), so repeat views are served by the CDN/browser instead of hitting Supabase Storage again (this is what keeps storage egress costs down).
  - Files larger than 4MB are redirected to a short-lived (5 min) signed URL instead of being streamed through the backend.
- Stored file references (in `urls.options`, `target_url`, etc.) use the proxy URL format. The backend also transparently rewrites any legacy `https://{project}.supabase.co/storage/v1/object/public/qr-assets/...` URLs to proxy URLs in API responses, so old rows keep working.

### Required Policies

You need to create RLS policies in Supabase Dashboard > Storage > Policies for the `qr-assets` bucket.

#### 1. Allow Authenticated Users to Upload (INSERT)
**Policy Name:** `Allow authenticated uploads`
**Operation:** INSERT (check this checkbox only)
**Target Roles:** Select "authenticated" (IMPORTANT: Do NOT leave as "defaults to all public roles" - this would allow anyone to upload!)
**Policy Definition:**
```sql
(
  (bucket_id = 'qr-assets'::text) AND
  (auth.role() = 'authenticated'::text) AND
  (
    (storage.foldername(name))[1] = 'files'::text OR
    (storage.foldername(name))[1] = 'menus'::text OR
    (storage.foldername(name))[1] = 'logos'::text
  )
)
```

#### 2. Allow Owners to Read Their Storage Metadata (SELECT)
**Policy Name:** `Allow owners to select their assets`
**Operation:** SELECT (check this checkbox only)
**Target Roles:** Select "authenticated"
**Policy Definition:**
```sql
(
  (bucket_id = 'qr-assets'::text) AND
  (owner_id = (select auth.uid()::text))
)
```

This owner-scoped policy does **not** make the bucket public. It is required by the browser-side Storage API when an authenticated owner deletes an asset. Public reads still go through the backend proxy.

#### 3. Allow Owners to Delete Their Assets (DELETE)
**Policy Name:** `Allow owners to delete their assets`
**Operation:** DELETE (check this checkbox only)
**Target Roles:** Select "authenticated" (IMPORTANT: Do NOT leave as "defaults to all public roles" - this would allow anyone to delete!)
**Policy Definition:**
```sql
(
  (bucket_id = 'qr-assets'::text) AND
  (owner_id = (select auth.uid()::text))
)
```

No UPDATE policy is required. Upload paths use random UUID filenames and uploads set `upsert: false`, so existing objects are never overwritten.

## Quick Setup Steps

1. Go to Supabase Dashboard
2. Navigate to Storage > `qr-assets` and make sure the bucket is **private** (public access OFF)
3. Navigate to Storage > Policies
4. Select the `qr-assets` bucket
5. Click "New Policy"
6. For each policy above (INSERT, SELECT, DELETE):
   - Choose the operation
   - Use "Custom policy" option
   - Paste the SQL from above
   - Save

## Notes

- **CRITICAL:** Always select "authenticated" as the target role. Leaving it as "defaults to all public roles" would allow anyone (even unauthenticated users) to access your storage!
- Authenticated users can upload to the allowed folders, but can only select/delete objects they own
- Public/anonymous users cannot read objects directly from Supabase Storage; public asset delivery goes through the backend proxy
- **Storage Cleanup:** When a user deletes a QR code, all associated files (menu files, logos, file QRCs, vCard photos) are automatically deleted from Supabase storage to free up space. Cleanup handles both proxy URLs and legacy Supabase public URLs.
- **Upload caching:** Uploads set `cacheControl: '31536000'` because filenames are random UUIDs (a new upload = a new URL), so objects are safe to cache immutably.

## Folder Structure

**IMPORTANT:** You do NOT need to manually create folders in Supabase Storage!

The folders (`files/`, `menus/`, `logos/`) are created automatically when files are uploaded. Supabase Storage uses a flat file system where the folder structure is part of the file path.

For example:
- When you upload a file to `files/abc123.pdf`, the `files/` folder is automatically created
- When you upload a menu to `menus/xyz789.jpg`, the `menus/` folder is automatically created
- When you upload a logo to `logos/logo456.png`, the `logos/` folder is automatically created

The storage policies check the folder name using `(storage.foldername(name))[1]`, which extracts the first folder from the path. As long as your uploads use the correct folder names (`files`, `menus`, or `logos`), everything will work correctly. The backend proxy enforces the same folder allowlist when serving files.
