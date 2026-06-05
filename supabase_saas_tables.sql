-- =============================================
-- TABELAS ADMINISTRATIVAS - A2 Solutions Sports Tracker
-- Execute este SQL no Supabase Dashboard:
-- https://supabase.com/dashboard → SQL Editor
-- =============================================

-- 1. Tabela de Gastos/Despesas Operacionais
CREATE TABLE IF NOT EXISTS public.saas_expenses (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Cupons de Promoção
CREATE TABLE IF NOT EXISTS public.saas_coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount INTEGER NOT NULL CHECK (discount > 0 AND discount <= 100),
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Módulos / Categorias Futuras
CREATE TABLE IF NOT EXISTS public.saas_features (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Configurações Genéricas (Chave-Valor JSON)
CREATE TABLE IF NOT EXISTS public.saas_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Row Level Security) em todas as tabelas
ALTER TABLE public.saas_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_settings ENABLE ROW LEVEL SECURITY;

-- Criar Políticas para permitir leitura pública rápida (simplifica o client e API fallback)
CREATE POLICY "Allow public read on saas_expenses" ON public.saas_expenses FOR SELECT USING (true);
CREATE POLICY "Allow public read on saas_coupons" ON public.saas_coupons FOR SELECT USING (true);
CREATE POLICY "Allow public read on saas_features" ON public.saas_features FOR SELECT USING (true);
CREATE POLICY "Allow public read on saas_settings" ON public.saas_settings FOR SELECT USING (true);

-- Popular dados mock padrão (caso as tabelas estejam vazias)
INSERT INTO public.saas_expenses (name, value, category) 
VALUES
  ('API-Football (api-sports.io)', 450.00, 'API'),
  ('Supabase Database & Auth', 150.00, 'Database'),
  ('Vercel Serverless Hosting', 100.00, 'Hosting'),
  ('Telegram Bot (VPS)', 50.00, 'Server'),
  ('Marketing & Anúncios (Meta/Google)', 1200.00, 'Marketing')
ON CONFLICT DO NOTHING;

INSERT INTO public.saas_coupons (code, discount, description) 
VALUES
  ('BRUTAL20', 20, '20% OFF na primeira mensalidade do plano PRO/VIP'),
  ('VIPFIRST', 40, '40% OFF no primeiro mês do plano VIP'),
  ('A2SOLUTIONS', 100, 'Acesso vitalício gratuito para parceiros')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.saas_features (name, description, active) 
VALUES
  ('Basquete NBA (Poisson)', 'Alertas de Handicap e Over/Under para NBA.', true),
  ('E-sports (Counter-Strike/LoL)', 'True Odds de vencedor e total de mapas.', false),
  ('Mercado de Cartões (Poisson Live)', 'Sinais +EV ao vivo para cartões amarelos.', true),
  ('WhatsApp Push Notifications', 'Disparo de oportunidades diretamente no celular.', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.saas_settings (key, value) 
VALUES
  ('sub_admins', '["admin.suporte@gmail.com", "parceiro.a2@gmail.com"]'::jsonb),
  ('expense_categories', '["Servidor", "Database", "API", "Marketing", "Outros"]'::jsonb),
  ('visitors_count', '10200'::jsonb),
  ('trial_count', '2450'::jsonb)
ON CONFLICT (key) DO NOTHING;
