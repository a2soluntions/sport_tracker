-- =============================================
-- MIGRAÇÃO: Adicionar coluna coupon_code na tabela profiles
-- Execute este SQL no Supabase Dashboard:
-- https://supabase.com/dashboard → SQL Editor
-- =============================================

-- Adicionar coluna coupon_code à tabela profiles
-- Armazena o código do cupom aplicado ao usuário (ex: "A2SOLUTIONS")
-- Usuários com cupom de 100% recebem acesso total sem gerar receita (MRR)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.coupon_code IS 'Código do cupom aplicado pelo admin. Cupons de 100% liberam acesso total gratuito sem gerar MRR.';
