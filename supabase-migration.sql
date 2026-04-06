-- =============================================
-- Migração: Novos campos para v3.0
-- Execute no Supabase SQL Editor
-- =============================================

-- Bio e status no colaborador
ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Tempo economizado por função
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS time_saved_minutes INTEGER DEFAULT 2;
