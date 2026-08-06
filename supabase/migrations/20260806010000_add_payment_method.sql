
ALTER TABLE public.orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod', 'online'));
