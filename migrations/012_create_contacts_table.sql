CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization text,
  name text,
  title text,
  email text,
  phone text,
  address text,
  notes text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage contacts"
  ON public.contacts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
