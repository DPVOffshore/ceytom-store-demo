import json, re, os, shutil

raw = json.load(open("raw2.json"))

# 49 catalog sections rolled into 8 shipboard-relevant groups
GROUPS = {
    "control-signalling": ("Control & Signalling", [
        "Emergency Stop Button Series", "19mm / 22mm Push Button Series", "30mm Push Button Series",
        "16mm Push Button Series", "Motor St art Push Button", "22mm & 30mm Selector Switch Series",
        "16mm Selector Switch Series", "22mm LED Panel Indicator Light", "30mm LED Panel Indicator Light",
        "16mm LED Panel Indicator Light", "Panel Bulbs", "Monolever Joystick Switch",
        "Hoist Pendant Switch Wireless & Non-Wireless Type", "Foot Switch",
    ]),
    "switching-isolation": ("Switching & Isolation", [
        "20A Rotary Cam Switch", "32-40A Rotary Cam Switch", "63-80A Rotary Cam Switch",
        "120A Rotary Cam Switch", "Motor Reversing Cam Switch", "Multi Step Rotary Cam Switch",
        "Star Delta Rotary Cam Switch", "Voltmeter & Ammeter Rotary Cam Switch",
        "Din Rail Isolator / Disconnect Switch", "MERZ Switches", "Toggle / Snap Switch",
        "Rocker Switch", "Automatic Transfer Switch (ATS)", "Switch Standard",
    ]),
    "alarm-warning": ("Alarm & Warning", [
        "Buzzer & Siren", "Warning Light", "Signal Tower Light",
    ]),
    "sensing-limit": ("Sensing & Limit Switches", [
        "Micro Limit Switch", "Mini Limit Switch", "10A Limit Switch",
        "Proximity & Photo Switch Senor", "Side Mount Type Listed",
    ]),
    "relays-timers": ("Relays, Timers & Control", [
        "Power Relay & Base", "Solid State Relay", "Protective / Floatless Relay - Din Rail",
        "Digital & Analog Timer", "Temperature Controller", "Smart Solutions",
    ]),
    "measurement": ("Measurement & Instrumentation", [
        "Measuring Instruments", "Current Transformers", "Transducers",
    ]),
    "power-distribution": ("Power & Distribution", [
        "Control Transformer", "Low Voltage Switchgear", "Terminal Block",
        "FastBlow / SlowBlow / Time-Delay Fuses",
    ]),
    "enclosures-accessories": ("Enclosures & Accessories", [
        "Control Protection Box", "Protection Cover / Guard", "Crimping Tools",
    ]),
}
SEC2GROUP = {}
for gid, (gname, secs) in GROUPS.items():
    for s in secs:
        SEC2GROUP[s] = gid

# Which shipboard systems each group typically serves — used for the "by system" browse axis
SYSTEMS = {
    "engine-room": ("Engine Room & Machinery Space",
                    ["switching-isolation", "relays-timers", "sensing-limit", "measurement"]),
    "bridge-wheelhouse": ("Bridge & Wheelhouse",
                          ["control-signalling", "alarm-warning", "measurement"]),
    "deck-machinery": ("Deck Machinery & Cranes",
                       ["control-signalling", "sensing-limit", "switching-isolation"]),
    "main-switchboard": ("Main Switchboard & MSB Panels",
                         ["power-distribution", "measurement", "switching-isolation"]),
    "pump-room": ("Pump Room & Cargo Systems",
                  ["relays-timers", "sensing-limit", "alarm-warning"]),
    "safety-alarm": ("Safety & General Alarm",
                     ["alarm-warning", "control-signalling", "enclosures-accessories"]),
}

def clean_desc(d):
    d = d.replace("*", " · ").strip(" ·").strip()
    d = re.sub(r"\s*·\s*", " · ", d)
    d = re.sub(r"\s+", " ", d)
    return d

def fix_weight(w):
    w = w.strip()
    if not w:
        return None
    w = w.replace(",", ".")
    m = re.match(r"^(\d+)[\s\.](\d+)$", w)
    if m:
        return float(f"{m.group(1)}.{m.group(2)}")
    try:
        return float(w)
    except ValueError:
        return None

BRAND_FIX = {
    "Hugo Muller -": ("Hugo Müller", "Germany"),
    "Hugo Muller": ("Hugo Müller", "Germany"),
    "Merz- Europe": ("MERZ", "Europe"),
    "Merz": ("MERZ", "Europe"),
    "Germany": ("Hugo Müller", "Germany"),
    "Telemecanique / Schneider Electric": ("Telemecanique / Schneider", "France"),
    "Easily Trade": ("Easily Trade", "Taiwan"),
    "Bussman": ("Bussmann", "USA"),
}

def split_brand(b):
    b = b.strip()
    if b in BRAND_FIX:
        return BRAND_FIX[b]
    POST = {"Hugo Muller": "Hugo Müller", "Bussman": "Bussmann", "Merz": "MERZ",
            "Telemecanique / Schneider Electric": "Telemecanique / Schneider"}
    if " - " in b:
        brand, origin = b.split(" - ", 1)
        brand = brand.strip()
        return POST.get(brand, brand), origin.strip()
    b = POST.get(b, b)
    if b in ("Sparta", "Shenler", "MERZ"):
        return b, "Taiwan" if b == "Sparta" else ""
    return b, ""

def certs(c):
    out = []
    for token, label in [("UL Listed", "UL Listed"), ("TUV", "TÜV"), ("CE Mark", "CE Mark"),
                         ("CSA", "CSA"), ("RoHS", "RoHS"), ("IEC", "IEC"), ("ABS", "ABS")]:
        if token.lower() in c.lower():
            out.append(label)
    return out

def facets(pn, desc, section):
    t = desc + " " + section
    f = {}

    amps = sorted({float(m) for m in re.findall(r"(\d+(?:\.\d+)?)\s?A\b", t)})
    amps = [a for a in amps if 0.05 <= a <= 1600]
    f["current"] = amps

    # keep the AC/DC suffix where the catalogue states it; drop the bare
    # duplicate when a suffixed reading of the same value already exists
    raw_v = {}
    for m in re.finditer(r"(\d{1,4}(?:\.\d)?)\s?V\s?(AC|DC)?", t):
        v = float(m.group(1))
        if not (5 <= v <= 1200):
            continue
        num = int(v) if v == int(v) else v
        suf = m.group(2) or ""
        raw_v.setdefault(num, set()).add(suf)
    volts = []
    for num, sufs in raw_v.items():
        real = {x for x in sufs if x}
        for suf in (sorted(real) if real else [""]):
            volts.append(f"{num}V{suf}")
    f["voltage"] = sorted(volts, key=lambda s: float(re.match(r"[\d.]+", s).group()))

    ip = sorted({f"IP{m}" for m in re.findall(r"IP\s?(\d{2})", t)})
    f["ip"] = ip

    holes = sorted({f"{m}mm" for m in re.findall(r"\b(16|19|22|25|30)\s?mm\b", t)}, key=lambda s: int(s[:-2]))
    f["holeDia"] = holes

    # three-figure readings are enclosure/body dimensions, not a panel cutout
    dims = sorted({f"{a}×{b}×{c}mm" for a, b, c in
                   re.findall(r"(\d{2,3})\s?[xX×]\s?(\d{2,3})\s?[xX×]\s?(\d{2,3})\s?mm", t)})
    f["dimensions"] = dims
    stripped = re.sub(r"\d{2,3}\s?[xX×]\s?\d{2,3}\s?[xX×]\s?\d{2,3}\s?mm", " ", t)
    pairs = re.findall(r"(\d{2,3})\s?[xX×]\s?(\d{2,3})\s?mm", stripped)
    # standard DIN panel cutouts — treat these as a plate size wherever they appear
    CUTOUTS = {"48×48mm", "64×64mm", "88×88mm", "96×96mm", "72×72mm",
               "84×84mm", "48×96mm", "60×48mm", "45×45mm"}
    plates, others = [], []
    for a, b in pairs:
        val = f"{a}×{b}mm"
        if val in CUTOUTS or re.search(r"Plate\s*Size", t, re.I):
            plates.append(val)
        else:
            others.append(val)
    f["plateSize"] = sorted(set(plates))
    f["dimensions"] = sorted(set(dims + others))

    poles = sorted({f"{m}P" for m in re.findall(r"(\d{1,2})\s?Pole", t)}, key=lambda s: int(s[:-1]))
    f["poles"] = poles

    contacts = sorted({re.sub(r"\s+", "", m) for m in re.findall(r"(\d?N[OC](?:\s?\+\s?\d?N[OC])*)", t)})
    f["contacts"] = [c for c in contacts if len(c) >= 2][:4]

    return f

products, slugs = [], set()
for r in raw:
    pn = r["pn"].strip()
    if not pn or len(pn) < 2:
        continue
    section = (r["section"] or "").strip()
    gid = SEC2GROUP.get(section)
    if not gid:
        continue
    slug = re.sub(r"[^a-z0-9]+", "-", pn.lower()).strip("-")
    if slug in slugs:
        continue
    slugs.add(slug)
    brand, origin = split_brand(r["brand"])
    desc = clean_desc(r["desc"])
    name = desc.split(" · ")[0][:80] if desc else pn
    f = facets(pn, desc, section)
    products.append({
        "id": slug,
        "partNumber": pn,
        "name": name,
        "description": desc,
        "category": section,
        "group": gid,
        "groupName": GROUPS[gid][0],
        "brand": brand,
        "origin": origin,
        "certifications": certs(r["cert"]),
        "weightKg": fix_weight(r["weight"]),
        "image": f"/products/{slug}.png" if r["xref"] else None,
        "stock": "In stock — Dubai" if (hash(slug) % 10) < 6 else ("Low stock — Dubai" if (hash(slug) % 10) < 8 else "Sourced to order"),
        "leadTime": None if (hash(slug) % 10) < 8 else f"{7 + hash(slug) % 14} days",
        **f,
    })

# rename image files to match slugs
IMG_SRC = "/home/claude/ceytom/public/products"
os.makedirs(IMG_SRC, exist_ok=True)

data = {
    "groups": [{"id": g, "name": n, "count": sum(1 for p in products if p["group"] == g)}
               for g, (n, _) in GROUPS.items()],
    "systems": [{"id": s, "name": n, "groups": gs} for s, (n, gs) in SYSTEMS.items()],
    "categories": sorted({p["category"] for p in products}),
    "products": products,
}
json.dump(data, open("catalog.json", "w"), indent=1)

print("products:", len(products))
print("groups:")
for g in data["groups"]:
    print(f"  {g['count']:4d}  {g['name']}")
print("brands:", sorted({p["brand"] for p in products if p["brand"]}))
print("origins:", sorted({p["origin"] for p in products if p["origin"]}))
print("with image:", sum(1 for p in products if p["image"]))
