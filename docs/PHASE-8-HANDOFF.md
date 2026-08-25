# Phase 8 handoff — provider boundary during Supabase pivot

**Phase:** 8 — user-owned publisher workspace
**Status:** boundary defined; no provider migration required

E-Teyvat remains the public provider for the first-party `vxnus` Teyvat
project. Its Neon database owns the normalized projection, retrieval chunks,
revisions, and optional embeddings. Supabase is an E Hub control-plane concern,
not a reason to move provider data.

The provider must continue to expose only public manifest/retrieval data and
must not depend on Supabase Auth, Hub service keys, or user database URLs.

## Verification gate

- Hub project metadata can point to the Teyvat provider URL;
- provider revision and citations remain unchanged through the Hub migration;
- provider deployment and Neon operations remain independently deployable.
