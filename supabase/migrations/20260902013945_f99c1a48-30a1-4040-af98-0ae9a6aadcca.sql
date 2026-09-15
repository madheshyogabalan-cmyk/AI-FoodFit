CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  age integer,
  sex text,
  height_cm numeric,
  weight_kg numeric,
  activity text,
  pref text,
  goal text,
  target_weight_kg numeric,
  budget numeric,
  lang text NOT NULL DEFAULT 'en',
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  day date NOT NULL,
  food_id text NOT NULL,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  slot text NOT NULL,
  nutrition jsonb NOT NULL DEFAULT '{}'::jsonb,
  at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX food_logs_user_day_idx ON public.food_logs (user_id, day);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_logs TO authenticated;
GRANT ALL ON public.food_logs TO service_role;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food logs" ON public.food_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.day_water (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  day date NOT NULL,
  water_ml integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_water TO authenticated;
GRANT ALL ON public.day_water TO service_role;
ALTER TABLE public.day_water ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water" ON public.day_water FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.weights (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  day date NOT NULL,
  kg numeric NOT NULL,
  PRIMARY KEY (user_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weights TO authenticated;
GRANT ALL ON public.weights TO service_role;
ALTER TABLE public.weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weights" ON public.weights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.alert_dismissals (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  day date NOT NULL,
  alert_id text NOT NULL,
  PRIMARY KEY (user_id, day, alert_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_dismissals TO authenticated;
GRANT ALL ON public.alert_dismissals TO service_role;
ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dismissals" ON public.alert_dismissals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER day_water_updated_at BEFORE UPDATE ON public.day_water FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();