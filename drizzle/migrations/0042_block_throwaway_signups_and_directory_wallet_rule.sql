CREATE TABLE public.blocked_email_domains (
  domain text PRIMARY KEY CHECK (domain = lower(domain) AND domain <> ''),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_email_domains TO authenticated;
GRANT ALL ON public.blocked_email_domains TO service_role;
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage blocked email domains" ON public.blocked_email_domains
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.email_domain_blocked(_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH d AS (SELECT lower(trim(split_part(coalesce(_email, ''), '@', 2))) AS dom)
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_email_domains b, d
    WHERE d.dom <> ''
      AND (d.dom = b.domain OR right(d.dom, length(b.domain) + 1) = '.' || b.domain)
  );
$function$;
REVOKE ALL ON FUNCTION public.email_domain_blocked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_domain_blocked(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  wallet_addr text;
  display_name text;
BEGIN
  -- Refuse throwaway inboxes; wallet logins use an internal address and are never blocked
  IF NEW.email IS NOT NULL
     AND lower(NEW.email) NOT LIKE '%@wallet.payhme.local'
     AND public.email_domain_blocked(NEW.email) THEN
    RAISE EXCEPTION 'Sign-ups from this email provider are not allowed'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Wallet logins set raw_user_meta_data.wallet_address
  wallet_addr := NEW.raw_user_meta_data->>'wallet_address';

  IF wallet_addr IS NOT NULL THEN
    display_name := substr(wallet_addr, 1, 6) || '…' || substr(wallet_addr, length(wallet_addr) - 3);
  ELSE
    display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    display_name,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'merchant')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'trialing')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_directory(_since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT s.*,
      GREATEST(s.updated_at, COALESCE((SELECT max(c.updated_at) FROM public.chain_configs c WHERE c.store_id = s.id), s.updated_at)) AS changed_at,
      (s.listing_visibility <> 'hidden' AND s.deactivated_at IS NULL
        AND EXISTS (SELECT 1 FROM public.chain_configs w
                    WHERE w.store_id = s.id AND w.enabled AND w.chain::text <> 'lightning')) AS listed,
      (s.listing_visibility = 'full') AS is_full,
      (s.listing_visibility = 'full' AND s.business_presence <> 'online') AS show_place
    FROM public.stores s
  ),
  coins AS (
    SELECT c.store_id,
      array(SELECT DISTINCT x FROM unnest(array_agg(upper(c.chain::text)) || COALESCE(array_agg(u) FILTER (WHERE u IS NOT NULL), '{}')) x ORDER BY x) AS list
    FROM public.chain_configs c
    LEFT JOIN LATERAL unnest(COALESCE(c.stables, '{}')) u ON true
    WHERE c.enabled AND c.chain::text <> 'lightning'
    GROUP BY c.store_id
  ),
  term AS (
    SELECT DISTINCT ON (store_id) store_id, last_seen_lat, last_seen_lng, last_seen_city, last_seen_country
    FROM public.terminals
    WHERE revoked_at IS NULL AND last_seen_at > now() - interval '30 days'
    ORDER BY store_id, last_seen_at DESC NULLS LAST
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'since', _since,
    'stores', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', b.id,
        'slug', CASE WHEN b.is_full THEN b.url_slug END,
        'listing', CASE WHEN b.is_full AND b.business_presence = 'online' THEN 'online' ELSE b.listing_visibility END,
        'status', 'live',
        'name', CASE WHEN b.is_full THEN b.name END,
        'category', b.business_category,
        'description', CASE WHEN b.is_full THEN b.business_description END,
        'logo_url', CASE WHEN b.is_full THEN b.business_logo_url END,
        'presence', b.business_presence,
        'address', jsonb_build_object(
          'street', CASE WHEN b.show_place THEN b.business_address END,
          'city', CASE WHEN b.is_full AND NOT b.show_place THEN b.business_city ELSE COALESCE(b.business_city, t.last_seen_city) END,
          'region', b.business_region,
          'postal_code', CASE WHEN b.show_place THEN b.business_postal_code END,
          'country', COALESCE(b.business_country, t.last_seen_country)
        ),
        'location', CASE
          WHEN b.is_full AND NOT b.show_place THEN NULL
          WHEN COALESCE(b.business_lat, t.last_seen_lat) IS NULL THEN NULL
          ELSE jsonb_build_object(
            'lat', CASE WHEN b.is_full THEN COALESCE(b.business_lat, t.last_seen_lat) ELSE round(COALESCE(b.business_lat, t.last_seen_lat)::numeric, 1) END,
            'lng', CASE WHEN b.is_full THEN COALESCE(b.business_lng, t.last_seen_lng) ELSE round(COALESCE(b.business_lng, t.last_seen_lng)::numeric, 1) END,
            'precision', CASE WHEN b.is_full THEN 'exact' ELSE 'city' END
          ) END,
        'phone', CASE WHEN b.is_full THEN b.business_phone END,
        'website', CASE WHEN b.is_full THEN b.website END,
        'hours', CASE WHEN b.is_full THEN b.business_hours END,
        'accepts', COALESCE(to_jsonb(co.list), '[]'::jsonb),
        'egiving', jsonb_build_object('accepted', COALESCE(b.egiving_enabled, false) AND 'TSD' = ANY(COALESCE(co.list, '{}')), 'discount_pct', CASE WHEN COALESCE(b.egiving_enabled, false) AND 'TSD' = ANY(COALESCE(co.list, '{}')) THEN b.egiving_discount_pct END),
        'updated_at', b.changed_at
      ) ORDER BY b.changed_at DESC)
      FROM base b
      LEFT JOIN coins co ON co.store_id = b.id
      LEFT JOIN term t ON t.store_id = b.id
      WHERE b.listed AND (_since IS NULL OR b.changed_at > _since)
    ), '[]'::jsonb),
    'removed', CASE WHEN _since IS NULL THEN '[]'::jsonb ELSE COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', b.id, 'status', CASE WHEN b.deactivated_at IS NOT NULL THEN 'closed' ELSE 'unlisted' END, 'removed_at', b.changed_at))
      FROM base b WHERE NOT b.listed AND b.changed_at > _since
    ), '[]'::jsonb) END
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_merchant_map_pins()
 RETURNS TABLE(store_id uuid, listing_visibility text, name text, website text, description text, address text, logo_url text, category text, city text, country text, lat numeric, lng numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id,
    s.listing_visibility,
    CASE WHEN s.listing_visibility = 'full' THEN s.name END,
    CASE WHEN s.listing_visibility = 'full' THEN s.website END,
    CASE WHEN s.listing_visibility = 'full' THEN s.business_description END,
    CASE WHEN s.listing_visibility = 'full' THEN s.business_address END,
    CASE WHEN s.listing_visibility = 'full' THEN s.business_logo_url END,
    s.business_category,
    COALESCE(s.business_city, t.last_seen_city),
    COALESCE(s.business_country, t.last_seen_country),
    CASE
      WHEN s.listing_visibility = 'full'
        THEN COALESCE(s.business_lat, t.last_seen_lat)
      ELSE ROUND(COALESCE(s.business_lat, t.last_seen_lat)::numeric, 1)
    END,
    CASE
      WHEN s.listing_visibility = 'full'
        THEN COALESCE(s.business_lng, t.last_seen_lng)
      ELSE ROUND(COALESCE(s.business_lng, t.last_seen_lng)::numeric, 1)
    END
  FROM public.stores s
  LEFT JOIN LATERAL (
    SELECT last_seen_lat, last_seen_lng, last_seen_city, last_seen_country
    FROM public.terminals
    WHERE store_id = s.id
      AND revoked_at IS NULL
      AND last_seen_at > now() - interval '30 days'
    ORDER BY last_seen_at DESC NULLS LAST
    LIMIT 1
  ) t ON true
  WHERE s.listing_visibility <> 'hidden'
    AND EXISTS (SELECT 1 FROM public.chain_configs w
                WHERE w.store_id = s.id AND w.enabled AND w.chain::text <> 'lightning')
    AND (
      (s.business_lat IS NOT NULL AND s.business_lng IS NOT NULL)
      OR (t.last_seen_lat IS NOT NULL AND t.last_seen_lng IS NOT NULL)
    );
$function$;