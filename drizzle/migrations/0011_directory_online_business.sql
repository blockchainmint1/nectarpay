CREATE OR REPLACE FUNCTION public.get_public_directory(_since timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT s.*,
      GREATEST(s.updated_at, COALESCE((SELECT max(c.updated_at) FROM public.chain_configs c WHERE c.store_id = s.id), s.updated_at)) AS changed_at,
      (s.listing_visibility <> 'hidden' AND s.deactivated_at IS NULL) AS listed,
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