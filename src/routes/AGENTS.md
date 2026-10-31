# src/routes rules
- Any route whose `loader` or `beforeLoad` reads the browser Supabase session must set `ssr: false` (as `_authenticated.admin.tsx` does). Why: the server render has no session, so the guard's redirect fires and an address-bar open or refresh of that page bounces the user to Overview instead of the page they asked for.
