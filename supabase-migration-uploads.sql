-- =============================================
-- Migração: Upload de documentos por squad (v3.1)
-- Execute no Supabase SQL Editor (https://supabase.com/dashboard/project/pmmyqljiuslstwbmiron/sql/new)
-- =============================================

-- 1. Adicionar coluna documents na tabela squads
ALTER TABLE squads ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- 2. Criar bucket de Storage para os documentos das squads
-- (idempotente — ignora se já existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'squad-documents',
  'squad-documents',
  true,  -- público (URL direta acessível pela squad-api da VPS)
  52428800,  -- limite 50 MB por arquivo
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy RLS — permitir upload autenticado no caminho do próprio usuário
CREATE POLICY "Usuário pode subir documentos no próprio caminho"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'squad-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Policy RLS — permitir leitura pública (bucket público)
CREATE POLICY "Documentos das squads são públicos para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'squad-documents');

-- 5. Policy RLS — permitir deletar apenas o próprio
CREATE POLICY "Usuário pode deletar próprios documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'squad-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================
-- Pronto. Os arquivos serão organizados em:
--   squad-documents/{user_id}/{squad_id}/{timestamp}-{filename}
-- =============================================
