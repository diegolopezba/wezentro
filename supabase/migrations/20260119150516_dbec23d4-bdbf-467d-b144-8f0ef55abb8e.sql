-- Add business location and food badge columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_food_business BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS business_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS business_address TEXT;

-- Create menus table (one per user)
CREATE TABLE IF NOT EXISTS public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Menú',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Menus RLS Policies
CREATE POLICY "Anyone can view menus" ON public.menus 
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert menus" ON public.menus 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update menus" ON public.menus 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete menus" ON public.menus 
  FOR DELETE USING (auth.uid() = user_id);

-- Menu Items RLS Policies
CREATE POLICY "Anyone can view menu items" ON public.menu_items 
  FOR SELECT USING (true);

CREATE POLICY "Menu owners can insert items" ON public.menu_items 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_items.menu_id AND menus.user_id = auth.uid())
  );

CREATE POLICY "Menu owners can update items" ON public.menu_items 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_items.menu_id AND menus.user_id = auth.uid())
  );

CREATE POLICY "Menu owners can delete items" ON public.menu_items 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_items.menu_id AND menus.user_id = auth.uid())
  );

-- Trigger for updated_at on menus
CREATE TRIGGER update_menus_updated_at
  BEFORE UPDATE ON public.menus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();