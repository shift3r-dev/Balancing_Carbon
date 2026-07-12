# Demo data

## Baseline dataset

1. Register and sign in to Balancing Carbon once.
2. Open `comprehensive_demo_data.sql`.
3. Replace `REPLACE_WITH_YOUR_REGISTERED_EMAIL` with the registered email address.
4. Run the complete file in Supabase SQL Editor after migrations `000` through `021`.
5. Sign out and back in, or refresh the dashboard.

The script is idempotent. Rerunning it refreshes the same user-specific demo records.

## Data Hub fixtures

The CSV files exercise each available Phase 7 source definition. Before uploading one:

1. Open **Dashboard > Facilities** and copy a registered facility ID.
2. Replace `REPLACE_WITH_FACILITY_ID` in the CSV.
3. In **Data Hub**, select the matching data source.
4. Upload the file, validate the mapping, and add valid rows to staging.
5. Approve the staged row, then post it.
6. Confirm the row in the corresponding ledger and the dashboard refresh.

Energy posting also requires an active compatible emission factor in the current registry. Migration `014` supplies the demonstration India grid and renewable factors; production and environmental ledgers do not calculate carbon automatically.
