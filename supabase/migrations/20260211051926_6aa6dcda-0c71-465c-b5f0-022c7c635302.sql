-- Allow anyone authenticated (or anon) to read user_roles for admin badge display
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Anyone can view user roles"
ON public.user_roles
FOR SELECT
USING (true);
