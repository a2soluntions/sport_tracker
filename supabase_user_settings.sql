-- =============================================
-- TABELA USER_SETTINGS - A2 Solutions Sports Tracker
-- Execute este SQL no Supabase Dashboard:
-- https://supabase.com/dashboard → SQL Editor
-- =============================================

-- Remover a tabela antiga caso ela exista com tipo de ID incompatível (ex: integer)
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- 1. Criar tabela de configurações do usuário
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  banca NUMERIC(12, 2) DEFAULT 1000.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler suas próprias configurações
CREATE POLICY "Users can read own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = id);

-- Qualquer usuário autenticado pode atualizar suas próprias configurações
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = id);

-- Qualquer usuário autenticado pode inserir suas próprias configurações
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION update_user_settings_updated_at();
