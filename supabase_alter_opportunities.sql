-- =============================================
-- ALTERAÇÕES NA TABELA EV_OPPORTUNITIES - A2 Solutions Sports Tracker
-- Execute este SQL no Supabase Dashboard:
-- https://supabase.com/dashboard → SQL Editor
-- =============================================

-- Adicionar coluna de resultado do palpite (pending, green, red, void)
ALTER TABLE public.ev_opportunities ADD COLUMN IF NOT EXISTS resultado TEXT DEFAULT 'pending';

-- Adicionar coluna para salvar o placar final do jogo (ex: '2-1')
ALTER TABLE public.ev_opportunities ADD COLUMN IF NOT EXISTS placar_final TEXT;

-- Adicionar índices para acelerar a busca de estatísticas
CREATE INDEX IF NOT EXISTS idx_ev_opportunities_resultado ON public.ev_opportunities(resultado);
