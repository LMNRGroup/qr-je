# Supabase Storage RLS Policies Setup

## Bucket: `qr-assets`

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

#### 2. Allow Authenticated Users to Read (SELECT)
**Policy Name:** `Allow authenticated reads`
**Operation:** SELECT (check this checkbox only)
**Target Roles:** Select "authenticated" (IMPORTANT: Do NOT leave as "defaults to all public roles" - this would allow anyone to read!)
**Policy Definition:**
```sql
(
  (bucket_id = 'qr-assets'::text) AND
  (auth.role() = 'authenticated'::text)
)
```

#### 3. Allow Authenticated Users to Delete (DELETE)
**Policy Name:** `Allow authenticated deletes`
**Operation:** DELETE (check this checkbox only)
**Target Roles:** Select "authenticated" (IMPORTANT: Do NOT leave as "defaults to all public roles" - this would allow anyone to delete!)
**Policy Definition:**
```sql
(
  (bucket_id = 'qr-assets'::text) AND
  (auth.role() = 'authenticated'::text)
)
```

## Quick Setup Steps

1. Go to Supabase Dashboard
2. Navigate to Storage > Policies
3. Select the `qr-assets` bucket
4. Click "New Policy"
5. For each policy above:
   - Choose the operation (INSERT, SELECT, DELETE)
   - Use "Custom policy" option
   - Paste the SQL from above
   - Save

## Notes

- **CRITICAL:** Always select "authenticated" as the target role. Leaving it as "defaults to all public roles" would allow anyone (even unauthenticated users) to access your storage!
- These policies allow any authenticated user to upload/read/delete files
- For production, you may want to add user-specific path restrictions (e.g., `qr-assets/menus/{userId}/...`)
- The 403 error you're seeing is because these policies don't exist yet
- **Storage Cleanup:** When a user deletes a QR code, all associated files (menu files, logos, file QRCs, vCard photos) are automatically deleted from Supabase storage to free up space