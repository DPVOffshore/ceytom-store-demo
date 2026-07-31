import fitz, json, re, os
from PIL import Image
import io

SRC = "/mnt/user-data/uploads/HATCO_PRODUCT_CATALOG_2026_-_UPDATED.pdf"
OUT = "../public/products"
os.makedirs(OUT, exist_ok=True)

doc = fitz.open(SRC)
raw = json.load(open("raw2.json"))
cat = json.load(open("catalog.json"))
valid = {p["id"] for p in cat["products"]}

def slug(pn):
    return re.sub(r"[^a-z0-9]+", "-", pn.lower()).strip("-")

done, skipped = 0, 0
for r in raw:
    s = slug(r["pn"].strip())
    if s not in valid or not r["xref"]:
        continue
    path = os.path.join(OUT, f"{s}.webp")
    if os.path.exists(path):
        continue
    try:
        pix = fitz.Pixmap(doc, r["xref"])
        if pix.n - pix.alpha > 3:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        if img.width < 60 or img.height < 60:
            skipped += 1
            continue
        # trim near-white border so parts sit consistently in the card
        bg = Image.new("RGB", img.size, (255, 255, 255))
        from PIL import ImageChops
        diff = ImageChops.difference(img, bg).convert("L")
        bbox = diff.point(lambda v: 255 if v > 18 else 0).getbbox()
        if bbox:
            pad = 6
            bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                    min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad))
            img = img.crop(bbox)
        # square canvas, white, max 520px
        side = max(img.size)
        canvas = Image.new("RGB", (side, side), (255, 255, 255))
        canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
        if side > 520:
            canvas = canvas.resize((520, 520), Image.LANCZOS)
        canvas.save(path, "WEBP", quality=82, method=5)
        done += 1
    except Exception as e:
        skipped += 1

# point catalog at the webp files, drop images that failed
for p in cat["products"]:
    f = os.path.join(OUT, f"{p['id']}.webp")
    p["image"] = f"/products/{p['id']}.webp" if os.path.exists(f) else None

json.dump(cat, open("../lib/catalog.json", "w"), separators=(",", ":"))
print("saved:", done, "skipped:", skipped)
print("products with image:", sum(1 for p in cat["products"] if p["image"]), "/", len(cat["products"]))
