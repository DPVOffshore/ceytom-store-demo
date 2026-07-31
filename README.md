# Ceytom — Marine Electrical Storefront

Front-end prototype for **Ceytom Co L.L.C** (Dubai): a quote-driven storefront for marine
electrical switchgear, control and signalling components, aimed at commercial vessels.

Next.js 14 (App Router) · Tailwind CSS · mock data · no backend.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build && npm start   # production build (766 static pages)
```

No environment variables, no API keys, no network calls at build time.

---

## What this is built from

The catalogue is **not invented**. It is extracted from `HATCO_PRODUCT_CATALOG_2026`
(196 pages) and contains:

| | |
|---|---|
| Part numbers | **744** |
| Product photographs | **680** (91%) |
| Component families | 49, rolled into 8 groups |
| Manufacturers | 21 |
| Countries of origin | 7 |

Extraction scripts are in `tools/` (see below). `lib/catalog.json` is the generated output —
regenerate it rather than hand-editing.

### Why quote-only, with no prices

The source catalogue contains **no prices** — the "LIST 2026" column carries net weight only.
This resolves the open question in the Business Requirements Document: the storefront shows
*Price on request* throughout, and the RFQ basket is the single conversion path. There is no
add-to-cart and no checkout.

### Why the filters are what they are

The BRD was written around engine spares (IMPA/ISSA codes, engine-model fitment). This
catalogue is electrical control gear, where almost none of that applies. Filters are built on
the specifications that actually appear in the data and that a panel builder works from:

- Current rating (banded: ≤10 A, 10–25, 25–63, 63–125, >125)
- Voltage (12–48 V DC, 110–130 V, 220–240 V, ≥380 V)
- Ingress protection (IP20 → IP67)
- Mounting hole diameter (16 / 19 / 22 / 30 mm)
- Plate size (DIN cutouts: 48×48, 64×64, 88×88, 96×96, 72×72, 84×84, 48×96, 60×48)
- Pole count, contact arrangement, certification, manufacturer, origin, availability

Facet coverage is uneven by design — it reflects what the catalogue states. Empty fields are
hidden rather than shown blank. Coverage: certifications 97%, weight 95%, images 91%,
current 44%, voltage 37%, IP 26%, hole ø 22%, plate size 17%.

---

## Routes

| Route | Notes |
|---|---|
| `/` | Search-first hero, certification strip, browse axes, credentials |
| `/catalog` | Full filter rail + search + sort (client-side) |
| `/product/[id]` | Spec sheet, 744 static pages |
| `/quote` | RFQ basket, parts-list paste/upload matcher, request form |
| `/systems` · `/systems/[id]` | Six shipboard-location landing pages |
| `/brands` | Manufacturer table (cards on mobile) |
| `/about`, `/contact` | Credentials and enquiry guidance |
| `/policies/[slug]` | terms · shipping · returns · privacy (drafts) |

---

## Design tokens

Colours are **sampled from the logo pixels**, not eyeballed:

| Token | Hex | Use |
|---|---|---|
| `navy` | `#012731` | Dark surfaces, body text |
| `deep` | `#073D4A` | Secondary dark panels |
| `teal` | `#078F93` | Borders, fills, large display numbers |
| `tealink` | `#06787C` | Teal **text** on light backgrounds (4.5:1) |
| `coral` | `#EB6A4C` | CTA backgrounds — **paired with navy text** (5.01:1) |
| `coralink` | `#C94A2E` | Coral **text** on light backgrounds (4.66:1) |
| `mist` | `#E9EEF1` | Page background |
| `tint` | `#B7EEF1` | Highlights, text on navy |

Type: **Archivo Variable** (display) · **IBM Plex Sans** (body) · **IBM Plex Mono** (all part
numbers, specs and data). Self-hosted via `@fontsource` — no Google Fonts fetch.

Border radius is capped at 2px. No gradients. The only decorative element is a hairline
"wiring schematic" grid at 7% opacity on dark sections.

**Signature element:** every part number on the site is monospace and click-to-copy.

---

## Verification performed

Audited with headless Chrome at 1440px and 390px across nine routes:

- **Layout:** no horizontal overflow, no sub-11px text, no broken images, no console errors
- **Contrast:** 270 WCAG AA failures found and fixed → 1 remaining (the *disabled* submit
  button at 3.42:1, which is exempt as a disabled control)
- **Build:** 766 static pages, clean compile

Scripts: `audit.js` (layout) and `contrast.js` (full contrast sweep, composites the real
ancestor background chain). Both need a server running:

```bash
npm start & sleep 8 && node audit.js && node contrast.js
```

---

## Before this goes live

**1. Replace the placeholder company details.** All in one object — `COMPANY` in
`lib/data.js`. Currently placeholders: TRN, trade licence, landline, WhatsApp, email,
street address.

**2. Legal review.** The four policy pages are drafts and carry a visible warning banner.
They must be reviewed by a UAE-qualified advisor. Nothing here is legal advice.

**3. Decide the class-approval position.** Catalogue certifications are industrial —
CE (680 lines), UL (354), TÜV (300), CSA (284), IEC (26), RoHS (10). There is exactly
**one ABS reference and no DNV or Lloyd's Register**. For newbuilds and class-surveyed
vessels, marine type approval is often mandatory. `/about` currently states this honestly
rather than implying blanket approval. Keep it that way, or substantiate specific lines.

**4. Confirm authorised-distributor claims.** `/brands` states distribution status is claimed
only where held in writing. Verify before publishing.

**5. Stock and lead times are synthetic.** `stock` and `leadTime` in `lib/catalog.json` are
generated from a hash for demonstration. Wire these to real inventory.

**6. The RFQ form does not send.** `QuoteBuilder.submit()` mocks a reference number. Point it
at the sales inbox, and consider logging each request as a draft order for traceability —
email-only gives no visibility into quote-to-order conversion.

---

## Regenerating the catalogue

```bash
cd tools
pip install pymupdf pillow --break-system-packages
python3 extract.py    # PDF → raw2.json  (positional parse)
python3 enrich.py     # raw2.json → catalog.json  (facets, groups, brands)
python3 images.py     # embedded images → public/products/*.webp + lib/catalog.json
```

Two things made this non-trivial and are worth knowing if you re-run it:

- Section headers in the PDF are **letter-spaced** (`2 0 A  R o t a r y  C a m  S w i t c h`).
  They are recovered by detecting the yellow header bands from the PDF's drawing operators,
  then rejoining characters by measuring inter-character gaps.
- The weight column uses **spaces instead of decimal points** (`0 04` = 0.04 kg).

Images are trimmed of their white border, centred on a square canvas, capped at 520px and
converted to WebP (7.9 MB for all 680).
