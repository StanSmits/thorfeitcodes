-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles without RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create table for road signs (RVV 1990 knowledge base)
CREATE TABLE public.road_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sign_code TEXT NOT NULL UNIQUE,
  sign_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on road_signs
ALTER TABLE public.road_signs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for road_signs (public read, admin write)
CREATE POLICY "Anyone can view road signs"
ON public.road_signs
FOR SELECT
USING (true);

CREATE POLICY "Admins and moderators can insert road signs"
ON public.road_signs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can update road signs"
ON public.road_signs
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete road signs"
ON public.road_signs
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update feitcodes RLS policies for moderators
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.feitcodes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.feitcodes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.feitcodes;

CREATE POLICY "Admins and moderators can insert feitcodes"
ON public.feitcodes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can update feitcodes"
ON public.feitcodes
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete feitcodes"
ON public.feitcodes
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update factcode_suggestions RLS policies
DROP POLICY IF EXISTS "Enable Select for authenticated users only" ON public.factcode_suggestions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.factcode_suggestions;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.factcode_suggestions;

CREATE POLICY "Admins and moderators can view suggestions"
ON public.factcode_suggestions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can update suggestions"
ON public.factcode_suggestions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete suggestions"
ON public.factcode_suggestions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updating updated_at on road_signs
CREATE TRIGGER update_road_signs_updated_at
BEFORE UPDATE ON public.road_signs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();