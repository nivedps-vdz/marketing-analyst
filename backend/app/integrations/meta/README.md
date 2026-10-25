# Meta integration (Phase 2, not implemented)

Planned scope, read-only:

- Account discovery for the token's authorised ad accounts (`ads_read` permission).
- Campaigns, ad sets, ads, creatives (format, aspect ratio, thumbnail references).
- Daily insights per ad (`time_increment=1`), with `action_type` values mapped to `lead` and `purchase`, and
  the attribution setting stored with each conversion row.
- Period-level reach fetched separately, because daily reach cannot be summed.
- Pagination, rate-limit back-off, retries, token-expiry detection, sync history.

Before implementing, verify the current API version, required permissions, App Review needs and field names
against the official Meta documentation. Nothing here has been tested against the live API yet.
