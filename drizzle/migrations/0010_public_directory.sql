ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS business_postal_code text,
  ADD COLUMN IF NOT EXISTS business_hours text;

GRANT SELECT (business_postal_code, business_hours) ON public.stores TO authenticated;
GRANT UPDATE (business_postal_code, business_hours) ON public.stores TO authenticated;
GRANT INSERT (business_postal_code, business_hours) ON public.stores TO authenticated;

-- Public merchant directory: safe projection only. City-pin stores expose no name/address/contact.
CREATE OR REPLACE FUNCTION public.get_public_directory(_since timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT s.*,
      GREATEST(s.updated_at, COALESCE((SELECT max(c.updated_at) FROM public.chain_configs c WHERE c.store_id = s.id), s.updated_at)) AS changed_at,
      (s.listing_visibility <> 'hidden' AND s.deactivated_at IS NULL) AS listed
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
        'slug', CASE WHEN b.listing_visibility = 'full' THEN b.url_slug END,
        'listing', b.listing_visibility,
        'status', 'live',
        'name', CASE WHEN b.listing_visibility = 'full' THEN b.name END,
        'category', b.business_category,
        'description', CASE WHEN b.listing_visibility = 'full' THEN b.business_description END,
        'logo_url', CASE WHEN b.listing_visibility = 'full' THEN b.business_logo_url END,
        'presence', b.business_presence,
        'address', jsonb_build_object(
          'street', CASE WHEN b.listing_visibility = 'full' THEN b.business_address END,
          'city', COALESCE(b.business_city, t.last_seen_city),
          'region', b.business_region,
          'postal_code', CASE WHEN b.listing_visibility = 'full' THEN b.business_postal_code END,
          'country', COALESCE(b.business_country, t.last_seen_country)
        ),
        'location', CASE WHEN COALESCE(b.business_lat, t.last_seen_lat) IS NULL THEN NULL ELSE jsonb_build_object(
          'lat', CASE WHEN b.listing_visibility = 'full' THEN COALESCE(b.business_lat, t.last_seen_lat) ELSE round(COALESCE(b.business_lat, t.last_seen_lat)::numeric, 1) END,
          'lng', CASE WHEN b.listing_visibility = 'full' THEN COALESCE(b.business_lng, t.last_seen_lng) ELSE round(COALESCE(b.business_lng, t.last_seen_lng)::numeric, 1) END,
          'precision', CASE WHEN b.listing_visibility = 'full' THEN 'exact' ELSE 'city' END
        ) END,
        'phone', CASE WHEN b.listing_visibility = 'full' THEN b.business_phone END,
        'website', CASE WHEN b.listing_visibility = 'full' THEN b.website END,
        'hours', CASE WHEN b.listing_visibility = 'full' THEN b.business_hours END,
        'accepts', COALESCE(to_jsonb(co.list), '[]'::jsonb),
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
$$;

REVOKE ALL ON FUNCTION public.get_public_directory(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_directory(timestamptz) TO anon, authenticated, service_role;