# Coffee purchase audit (read-only, done). Nothing in the app or data was changed.

## Where the figures come from
- **Quantity and dates:** `coffee_records`, using `date` (the store's business date, kg) and `kilograms`. The Store Audit report filters on the same `date` field.
- **Value:** `finance_coffee_lots.total_amount_ugx`, linked through `coffee_record_id`. I used one lot per delivery (the newest) so no delivery is counted twice.
- **Counted as purchased:** deliveries with status assessed, inventory, sold_out or AWAITING_PRICING.
- **Left out:** pending deliveries (no assessment and no price yet) and QUALITY_REJECTED. None are marked deleted or cancelled, because the table has no such status.
- Assessments and offers are only used through their priced Finance lot. I didn't add them in separately.

## Results (accepted purchases)
| Period | Records | kg | UGX | Unpriced |
|---|---|---|---|---|
| 1. 1–30 Sep 2026 | 707 | 477,745 | 7,047,507,716 | 1 record |
| 2. 1–20 Oct 2026 | 147 | 103,405 | 1,511,250,931 | 0 |
| 3. 1–31 Oct 2026 (last date 26 Oct) | 188 | 125,607 | 1,853,603,721 | 0 |
| 4. All time (8 May 2025 – 26 Oct 2026) | 4,371 | 3,190,504.5 | 72,226,393,943 | 66 records, 52,105 kg without a lot |

**By coffee type** (the system stores both "Arabica" and "arabica"; I've combined them here):
- **September:** Arabica 704 records, 477,713 kg, UGX 7,047,158,716. Robusta 3 records, 32 kg, UGX 349,000.
- **1–20 Oct:** Arabica 141 records, 102,224 kg, UGX 1,496,857,831. Robusta 6 records, 1,181 kg, UGX 14,393,100.
- **October to date:** Arabica 181 records, 124,218 kg, UGX 1,836,922,621. Robusta 7 records, 1,389 kg, UGX 16,681,100.
- **All time:** Arabica 3,136,050.5 kg. Robusta 53,695 kg. Mixed 661 kg. One record has the coffee type typed as "98" (98 kg).

## Not counted above
- **Pending, not yet assessed:**
  - September: 15 records, 21,677 kg
  - 1–20 Oct: 27 records, 22,385 kg (dated up to 15 Oct)
  - October to date: 70 records, 75,348 kg
- **Quality rejected:**
  - September: 23 records, 20,854 kg. 11 of these were bought at discretion: 13,467 kg, UGX 196,308,200.
  - October: 2 records, 3,093 kg

## Compared with the Excel workbook
- **September:** the system shows 477,745 kg and UGX 7.05B. Excel shows 402,684 kg and UGX 5.99B. **The system is higher by 75,061 kg and UGX 1,060,795,731.** Even after adding pending and rejected deliveries, the gap doesn't close, so Excel seems to be missing deliveries.
- **October:** Excel only has quantities up to 15 Oct, so the fair system period is 1–15 Oct. I haven't pulled that yet (the system's 1–20 Oct total is 103,405 kg). **The system's 1–20 Oct total is about twice Excel's 54,039 kg and UGX 769.5M.**

## Data problems found
- 2 deliveries in Sep–Oct each have two Finance lots (one READY_FOR_FINANCE and one PAID). My totals count only the newest lot, which may not be the paid one.
- 66 older deliveries have no Finance lot or price.
- Coffee type spelling is inconsistent ("Arabica" vs "arabica", one "98").

## Queries used
- Status totals: `select status,count(*),sum(kilograms) from coffee_records group by 1`
- Totals: `coffee_records` filtered with `date between` each period's start and end, joined to `select distinct on (coffee_record_id) ... from finance_coffee_lots order by coffee_record_id, created_at desc`, status in the accepted list, grouped by period and coffee type.

## Possible next step
Approve this if you'd like me to pull the 1–15 Oct total and a list of each September delivery (supplier, batch, kg, UGX), so you can match them row by row against the workbook.
