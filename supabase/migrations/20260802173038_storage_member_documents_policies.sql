/*
# Storage Policies for Member Documents

## Overview
Creates storage bucket policies so members can upload and read their own documents.
The bucket 'member-documents' was created via execute_sql.

## Security
- Members can read and upload only files in their own folder (user_id/)
- Uses auth.uid() for ownership checks
*/

-- Allow authenticated users to read their own documents
DROP POLICY IF EXISTS "read_own_documents" ON storage.objects;
CREATE POLICY "read_own_documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'member-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to upload their own documents
DROP POLICY IF EXISTS "insert_own_documents" ON storage.objects;
CREATE POLICY "insert_own_documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'member-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own documents
DROP POLICY IF EXISTS "delete_own_documents" ON storage.objects;
CREATE POLICY "delete_own_documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'member-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
