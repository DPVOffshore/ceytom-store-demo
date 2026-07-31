import fitz, re, json, os

SRC = "/mnt/user-data/uploads/HATCO_PRODUCT_CATALOG_2026_-_UPDATED.pdf"
doc = fitz.open(SRC)

COLS = [50, 140, 350, 430, 535, 585, 720]

def col_of(x):
    for i in range(len(COLS) - 1):
        if COLS[i] <= x < COLS[i + 1]:
            return i
    return None

def plain(items):
    """Normal text: words already tokenised correctly."""
    return re.sub(r"\s+", " ", " ".join(t for _, _, t in items)).strip()

def despace(items, gap_thresh=3.2):
    """items: list of (x0, x1, text) sorted by x. Rejoin letter-spaced text."""
    if not items:
        return ""
    words, cur = [], items[0][2]
    for i in range(1, len(items)):
        gap = items[i][0] - items[i - 1][1]
        if gap > gap_thresh:
            words.append(cur)
            cur = items[i][2]
        else:
            cur += items[i][2]
    words.append(cur)
    return re.sub(r"\s+", " ", " ".join(words)).strip()

def is_yellow(c):
    if not c:
        return False
    try:
        r, g, b = c[0], c[1], c[2]
    except Exception:
        return False
    return r > 0.75 and g > 0.75 and b < 0.45

products, seen = [], set()
section = None

for pno in range(len(doc)):
    page = doc[pno]
    words = [w for w in page.get_text("words") if (w[1] + w[3]) / 2 > 70]

    # rows keyed by vertical band
    rows = {}
    for w in words:
        cy = (w[1] + w[3]) / 2
        rows.setdefault(round(cy / 6), []).append((w[0], w[2], cy, w[4]))

    # --- yellow section bands ---
    bands = []
    for d in page.get_drawings():
        if is_yellow(d.get("fill")):
            r = d["rect"]
            if r.width > 300 and r.height < 26:
                bands.append((r.y0 + r.y1) / 2)

    band_sections = []
    for by in sorted(bands):
        picked = []
        for key, items in rows.items():
            for x0, x1, cy, t in items:
                if abs(cy - by) < 9:
                    picked.append((x0, x1, t))
        picked.sort()
        label = despace(picked)
        if label and len(label) < 70:
            band_sections.append((by, label))

    ordered = sorted(rows.items())

    # --- product rows ---
    recs = []
    for key, items in ordered:
        items.sort()
        cy = items[0][2]
        if any(abs(cy - by) < 10 for by in bands):
            continue
        cells = {i: [] for i in range(6)}
        for x0, x1, c_y, t in items:
            c = col_of(x0)
            if c is not None:
                cells[c].append((x0, x1, t))
        pn = plain(cells[0])
        if pn and re.match(r"^\*?[A-Z0-9][A-Z0-9\-/\.]{1,22}$", pn) and pn not in ("PART", "LIST", "NET"):
            recs.append({"pn": pn, "cy": cy, "cells": cells})

    # continuation rows fold into nearest record
    for key, items in ordered:
        items.sort()
        cy = items[0][2]
        if any(abs(cy - by) < 10 for by in bands):
            continue
        cells = {i: [] for i in range(6)}
        for x0, x1, c_y, t in items:
            c = col_of(x0)
            if c is not None:
                cells[c].append((x0, x1, t))
        if plain(cells[0]):
            continue
        cand = [r for r in recs if abs(r["cy"] - cy) < 46]
        if not cand:
            continue
        tgt = min(cand, key=lambda r: abs(r["cy"] - cy))
        for c in (1, 2, 3, 4):
            tgt["cells"][c].extend(cells[c])

    # images
    imgs = []
    for info in page.get_image_info(xrefs=True):
        b = info["bbox"]
        if (b[2] - b[0]) < 40 or (b[3] - b[1]) < 40 or info["xref"] == 0:
            continue
        imgs.append({"xref": info["xref"], "cy": (b[1] + b[3]) / 2})

    for r in sorted(recs, key=lambda r: r["cy"]):
        # section = last yellow band above this row, else carry over
        above = [lbl for by, lbl in band_sections if by < r["cy"] + 4]
        if above:
            section = above[-1]
        pn = plain(r["cells"][0]).strip("*").strip()
        desc = plain(r["cells"][1])
        cert = plain(r["cells"][2])
        brand = plain(r["cells"][3])
        wt = plain(r["cells"][4])
        if not pn or pn in seen or (not desc and not cert):
            continue
        best, bd = None, 999
        for im in imgs:
            d = abs(im["cy"] - r["cy"])
            if d < bd:
                best, bd = im, d
        seen.add(pn)
        products.append({
            "pn": pn, "section": section, "desc": desc, "cert": cert,
            "brand": brand, "weight": wt, "page": pno + 1,
            "xref": best["xref"] if best and bd < 60 else None,
        })

    if band_sections:
        section = band_sections[-1][1]

print("products:", len(products))
json.dump(products, open("raw2.json", "w"), indent=1)

secs = {}
for p in products:
    secs[p["section"]] = secs.get(p["section"], 0) + 1
print("sections:", len(secs))
for k, v in sorted(secs.items(), key=lambda x: -x[1]):
    print(f"{v:4d}  {k}")
