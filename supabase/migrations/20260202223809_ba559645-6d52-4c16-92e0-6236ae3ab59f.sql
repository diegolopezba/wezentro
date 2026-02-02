-- Add menu categories table
CREATE TABLE public.menu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add category_id to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL;

-- Add business info columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN business_hours TEXT,
ADD COLUMN business_phone TEXT;

-- Enable RLS on menu_categories
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for menu_categories
CREATE POLICY "Anyone can view menu categories"
ON public.menu_categories FOR SELECT
USING (true);

CREATE POLICY "Menu owners can insert categories"
ON public.menu_categories FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM menus WHERE menus.id = menu_categories.menu_id AND menus.user_id = auth.uid()
));

CREATE POLICY "Menu owners can update categories"
ON public.menu_categories FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM menus WHERE menus.id = menu_categories.menu_id AND menus.user_id = auth.uid()
));

CREATE POLICY "Menu owners can delete categories"
ON public.menu_categories FOR DELETE
USING (EXISTS (
  SELECT 1 FROM menus WHERE menus.id = menu_categories.menu_id AND menus.user_id = auth.uid()
));