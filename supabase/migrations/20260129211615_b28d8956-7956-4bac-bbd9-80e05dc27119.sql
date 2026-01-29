-- Add business_type column to profiles for food businesses to specify restaurant or cafe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_type TEXT;

-- Add a check constraint to ensure valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_business_type_check 
CHECK (business_type IS NULL OR business_type IN ('restaurant', 'cafe'));