-- =============================================
-- ALTERAÇÕES NA TABELA USER_SETTINGS
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =============================================

-- Adicionar coluna para chat ID pessoal do Telegram
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Adicionar preferências de recebimento de alertas
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS alert_prematch BOOLEAN DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS alert_live BOOLEAN DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS min_ev NUMERIC(5, 2) DEFAULT 5.00;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS receive_telegram BOOLEAN DEFAULT true;
