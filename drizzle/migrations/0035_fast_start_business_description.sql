ALTER TABLE public.fast_enrollments ADD COLUMN IF NOT EXISTS business_description text;
GRANT SELECT (business_description) ON public.fast_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE (business_description) ON public.fast_enrollments TO service_role;
CREATE OR REPLACE FUNCTION public.activate_fast_sticker(_id uuid, _manager uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f fast_enrollments%ROWTYPE; sid uuid;
BEGIN
 SELECT * INTO f FROM fast_enrollments WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Enrollment not found'; END IF;
 IF f.status='activated' THEN RETURN f.store_id; END IF;
 IF f.status <> 'pending' THEN RAISE EXCEPTION 'Enrollment is not pending'; END IF;
 IF substring(f.tsd_address from 2 for 6) <> f.coin_id THEN RAISE EXCEPTION 'Coin code mismatch'; END IF;
 INSERT INTO stores(owner_id,name,website,business_description,fiat_currency,business_address,business_city,business_region,business_country,business_postal_code,business_category,business_phone,egiving_enabled,listing_visibility,mempool_accept_slow,tsd_instant,tsd_instant_max_usd)
 VALUES (_manager,f.business_name,f.website,f.business_description,'USD',f.street,f.city,f.region,f.country,f.postal_code,f.category,f.phone,f.egiving_opt_in,CASE WHEN f.directory_opt_in THEN 'full' ELSE 'hidden' END,true,true,250) RETURNING id INTO sid;
 INSERT INTO chain_configs(store_id,chain,xpub_or_address,xpub,enabled,stables) VALUES (sid,'txc',f.tsd_address,NULL,true,ARRAY['TSD']);
 INSERT INTO store_notification_prefs(store_id,user_id,enabled,email_enabled,email_address,telegram_enabled,events) VALUES (sid,_manager,true,true,f.email,false,'{"invoice_paid":true,"invoice_underpaid":true,"invoice_overpaid":true}'::jsonb);
 UPDATE fast_enrollments SET store_id=sid,status='activated',activated_at=now() WHERE id=_id;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.activate_fast_sticker(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_fast_sticker(uuid,uuid) TO service_role;