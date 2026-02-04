-- Migration: 0015_storage_buckets.sql
-- Description: Pre-create storage buckets with RLS policies
-- Date: 2026-02-03

-- =============================================================================
-- COMPANY LOGOS BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos to their own path
CREATE POLICY "company_logos_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own logos
CREATE POLICY "company_logos_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own logos
CREATE POLICY "company_logos_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access for logos (bucket is public)
CREATE POLICY "company_logos_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-logos');

-- =============================================================================
-- DOCUMENTS BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Founders can upload documents to their company path
CREATE POLICY "documents_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.current_user_role() = 'founder'
);

-- Founders can update their own documents
CREATE POLICY "documents_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.current_user_role() = 'founder'
  AND owner = auth.uid()
);

-- Founders can delete their own documents
CREATE POLICY "documents_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.current_user_role() = 'founder'
  AND owner = auth.uid()
);

-- Authenticated users can read documents they have access to
-- (application-level access control via API routes)
CREATE POLICY "documents_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');
