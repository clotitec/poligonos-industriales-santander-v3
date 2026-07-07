#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Merge old CSV company data into new data.js empresas array.
"""

import csv
import re
import os
import unicodedata
from difflib import SequenceMatcher

# ── Paths ──────────────────────────────────────────────────────────────────
BASE = r"D:\..... continua claude\Poligonos_Santander_v3\poligonos-industriales-santanderv3-main"
CSV_PATH = os.path.join(BASE, "SANTANDER EMPRESAS ÁREAS INDUSTRIALES - EMPRESAS ÁREAS INDUSTRIALES SANTANDER.csv")
DATA_JS_PATH = os.path.join(BASE, "data.js")
AUDIO_DIR = r"D:\..... continua claude\Poligonos_Santander_v3\Spots Poligonos industriales\spots_audio"

# ── Normalisation helpers ──────────────────────────────────────────────────
def remove_accents(s):
    nfkd = unicodedata.normalize('NFKD', s)
    return ''.join(c for c in nfkd if unicodedata.category(c) != 'Mn')

def normalize_name(name):
    """Lowercase, remove accents, strip legal suffixes, punctuation, whitespace."""
    if not name:
        return ''
    s = name.strip()
    s = remove_accents(s.lower())
    # Remove common legal suffixes
    s = re.sub(r'\b(s\.?\s*l\.?u?\.?|s\.?\s*a\.?|s\.?\s*l\.?\s*l\.?|s\.?\s*c\.?|sociedad\s+limitada|sociedad\s+anonima)\b', '', s)
    # Remove punctuation except spaces
    s = re.sub(r'[^a-z0-9\s]', '', s)
    # Collapse whitespace
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def fuzzy_ratio(a, b):
    return SequenceMatcher(None, a, b).ratio()

# ── Read CSV ───────────────────────────────────────────────────────────────
csv_companies = []
with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_companies.append(row)

print(f"CSV loaded: {len(csv_companies)} companies")

# Build normalised lookup from CSV
csv_lookup = []  # list of (norm_nombre, norm_title, row)
for row in csv_companies:
    nombre = row.get('Nombre empresa', '') or ''
    title = row.get('Title', '') or ''
    csv_lookup.append((normalize_name(nombre), normalize_name(title), row))

# ── Read audio files ───────────────────────────────────────────────────────
audio_files = os.listdir(AUDIO_DIR) if os.path.isdir(AUDIO_DIR) else []
# Parse audio file names: extract company name part
# Format: SPOT_XX_COMPANYNAME_ESTILO_X.mp3
audio_map = {}  # normalised name -> filename
for af in audio_files:
    m = re.match(r'SPOT_\d+_(.+?)_ESTILO_[A-Z]\.mp3$', af, re.IGNORECASE)
    if m:
        raw_name = m.group(1).replace('_', ' ')
        norm = normalize_name(raw_name)
        audio_map[norm] = af

print(f"Audio files found: {len(audio_map)}")

# ── Read data.js ───────────────────────────────────────────────────────────
with open(DATA_JS_PATH, 'r', encoding='utf-8') as f:
    datajs_content = f.read()

# Find the empresas array boundaries
empresas_start_marker = 'const empresas = ['
start_idx = datajs_content.index(empresas_start_marker)
# Find matching ];
# We need to find the `];` that closes this array
bracket_pos = start_idx + len(empresas_start_marker) - 1  # position of '['
depth = 1
i = bracket_pos + 1
while i < len(datajs_content) and depth > 0:
    ch = datajs_content[i]
    if ch == '[':
        depth += 1
    elif ch == ']':
        depth -= 1
    elif ch == "'" or ch == '"':
        # skip strings
        quote = ch
        i += 1
        while i < len(datajs_content):
            if datajs_content[i] == '\\':
                i += 2
                continue
            if datajs_content[i] == quote:
                break
            i += 1
    elif ch == '`':
        # template literal
        i += 1
        while i < len(datajs_content) and datajs_content[i] != '`':
            if datajs_content[i] == '\\':
                i += 1
            i += 1
    i += 1

end_idx = i  # position after the ']'
# Include the ';' after ']'
if end_idx < len(datajs_content) and datajs_content[end_idx] == ';':
    end_idx += 1

before_empresas = datajs_content[:start_idx]
after_empresas = datajs_content[end_idx:]

# ── Parse empresas from JS ─────────────────────────────────────────────────
# Extract the array content and parse with regex
empresas_text = datajs_content[bracket_pos + 1:end_idx - 2]  # content between [ and ];

# Parse each empresa object
empresas = []
# Split by looking for object boundaries
obj_pattern = re.compile(r'\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', re.DOTALL)
for m in obj_pattern.finditer(empresas_text):
    obj_text = m.group(1)
    emp = {}

    # Parse id (number)
    id_m = re.search(r'id:\s*(\d+)', obj_text)
    if id_m:
        emp['id'] = int(id_m.group(1))

    # Parse string fields
    for field in ['nombre', 'area', 'areaId', 'descripcion', 'sector', 'actividad',
                  'direccion', 'nave', 'cp', 'web', 'email', 'telefono', 'cif', 'cnae',
                  'streetView', 'googleMapsUrl', 'audioUrl']:
        pat = re.compile(rf"{field}:\s*'((?:[^'\\]|\\.)*)'", re.DOTALL)
        fm = pat.search(obj_text)
        if fm:
            emp[field] = fm.group(1)
        else:
            emp[field] = ''

    # Parse numeric fields
    for field in ['lat', 'lng']:
        pat = re.compile(rf'{field}:\s*(-?[\d.]+)')
        fm = pat.search(obj_text)
        if fm:
            emp[field] = float(fm.group(1))
        else:
            emp[field] = 0.0

    if 'id' in emp:
        empresas.append(emp)

print(f"Parsed {len(empresas)} empresas from data.js")

# ── Area corrections ───────────────────────────────────────────────────────
AREA_CORRECTIONS = {
    'ibis Styles Santander': ('parayas-norte', 'Parayas Norte'),
    'muebleX Santander': ('parayas-norte', 'Parayas Norte'),
    'Renault Santander - Vidal de la Peña': ('parayas-norte', 'Parayas Norte'),
    'Finca Tablanca': ('campon', 'El Campón - Peñacastillo'),
    'Autos Raúl': ('campon', 'El Campón - Peñacastillo'),
}

area_corrections_made = []

# ── Manual matches for tricky cases ────────────────────────────────────────
# new_nombre -> CSV Nombre empresa (exact as in CSV)
MANUAL_MATCHES = {
    'Taberna del herrero El Campón': 'La Taberna del Herrero',
    'U2F Ubudfittnesand fight': 'UBUD Fitness & Fight',
    'Hakuba Motor Honda': 'Honda',
    'Kia Numar Motor': 'Concesionario oficial Kia – Blendio Numar Motor Santander',
    'Audi Hercos Parayas': 'Concesionario Oficial Audi Hercos',
    'CARRERA MOTOR, S.A. Alfa Romeo': 'Taller Oficial Carrera Motor Carrocería',
    'Mitsubishi Cantabria - Blendio Devauto, S.L.U': 'Concesionario Mitsubishi Santander Blendio Devauto Santander',
    'Adarsa Mercedes': 'Adarsa Norte Mercedes-Benz Ventas',
    'Nissan Blendio | Santander': 'Concesionario Oficial Nissan Blendio Parayas Santander',
    'Ambar Cisga': 'Ambar Telecomunicaciones',
    'Subaru Cantabria - Comillas Motor': 'Subaru Comillas Motor',
}

# Companies that should NOT match (false positives to block)
BLOCK_MATCHES = {
    'muebleX Santander',  # not Merkamueble
    'ibis Styles Santander',  # not Lexus Santander
    'Flexicar Santander',  # not Lexus Santander
}

# ── Matching ───────────────────────────────────────────────────────────────
MATCH_THRESHOLD = 0.82

matched_count = 0
unmatched_new = []  # new empresas with no CSV match
matched_csv_indices = set()
match_details = []

# Reset transferable fields to empty for all empresas (in case of re-run)
for emp in empresas:
    for field in ['sector', 'descripcion', 'actividad', 'direccion', 'web', 'email',
                  'telefono', 'cif', 'cnae']:
        emp[field] = ''
    # Reset nave to S/N and keep existing cp
    emp['nave'] = 'S/N'
    emp['audioUrl'] = ''

# Build a reverse lookup for manual matches: CSV nombre -> index
csv_nombre_to_idx = {}
for idx, (_, _, row) in enumerate(csv_lookup):
    csv_nombre_to_idx[row.get('Nombre empresa', '')] = idx

for emp in empresas:
    emp_name_norm = normalize_name(emp['nombre'])

    # Check if blocked from matching
    if emp['nombre'] in BLOCK_MATCHES:
        best_score = 0
        best_idx = -1
        unmatched_new.append((emp['nombre'], 0, 'BLOCKED'))
        # Still try audio matching below
        if not emp['audioUrl']:
            audio_norm = normalize_name(emp['nombre'])
            best_audio_score = 0
            best_audio_file = None
            for anorm, afile in audio_map.items():
                s = fuzzy_ratio(audio_norm, anorm)
                min_al = min(len(anorm), len(audio_norm))
                if min_al >= 5 and (anorm in audio_norm or audio_norm in anorm):
                    s = max(s, 0.85)
                if s > best_audio_score:
                    best_audio_score = s
                    best_audio_file = afile
            if best_audio_score >= 0.70 and best_audio_file:
                emp['audioUrl'] = f'./audio/{best_audio_file}'
        # Area corrections
        if emp['nombre'] in AREA_CORRECTIONS:
            new_areaId, new_area = AREA_CORRECTIONS[emp['nombre']]
            old_area = emp['area']
            emp['areaId'] = new_areaId
            emp['area'] = new_area
            area_corrections_made.append((emp['nombre'], old_area, new_area))
        continue

    # Check manual matches first
    manual_csv_name = MANUAL_MATCHES.get(emp['nombre'])
    if manual_csv_name and manual_csv_name in csv_nombre_to_idx:
        best_idx = csv_nombre_to_idx[manual_csv_name]
        best_score = 0.95  # manual match
    else:
        best_score = 0
        best_idx = -1

        for idx, (csv_norm_nombre, csv_norm_title, row) in enumerate(csv_lookup):
            # Try matching against both nombre and title
            scores = []
            if csv_norm_nombre:
                scores.append(fuzzy_ratio(emp_name_norm, csv_norm_nombre))
            if csv_norm_title:
                scores.append(fuzzy_ratio(emp_name_norm, csv_norm_title))

            # Also check if one contains the other (but require min length to avoid false positives)
            containment_bonus = 0
            min_len = min(len(csv_norm_nombre), len(emp_name_norm)) if csv_norm_nombre else 0
            if min_len >= 5 and csv_norm_nombre and (csv_norm_nombre in emp_name_norm or emp_name_norm in csv_norm_nombre):
                containment_bonus = max(containment_bonus, 0.85)
            min_len_t = min(len(csv_norm_title), len(emp_name_norm)) if csv_norm_title else 0
            if min_len_t >= 5 and csv_norm_title and (csv_norm_title in emp_name_norm or emp_name_norm in csv_norm_title):
                containment_bonus = max(containment_bonus, 0.85)

            score = max(scores + [containment_bonus]) if (scores or containment_bonus) else 0

            if score > best_score:
                best_score = score
                best_idx = idx

    if best_score >= MATCH_THRESHOLD and best_idx >= 0:
        matched_count += 1
        matched_csv_indices.add(best_idx)
        csv_row = csv_lookup[best_idx][2]

        match_details.append((emp['nombre'], csv_row.get('Nombre empresa', ''), best_score))

        # Transfer fields
        emp['sector'] = (csv_row.get('Sector', '') or '').strip()
        emp['descripcion'] = (csv_row.get('Descripción corta empresa', '') or '').strip()
        emp['actividad'] = (csv_row.get('Actividad', '') or '').strip()
        emp['direccion'] = (csv_row.get('Dirección', '') or '').strip()
        nave_val = (csv_row.get('Nave', '') or '').strip()
        emp['nave'] = nave_val if nave_val else 'S/N'
        emp['cp'] = (csv_row.get('Código Postal', '') or '').strip()
        emp['web'] = (csv_row.get('Página web', '') or '').strip()
        emp['email'] = (csv_row.get('Email', '') or '').strip()
        emp['telefono'] = (csv_row.get('Teléfono', '') or '').strip()
        emp['cif'] = (csv_row.get('CIF', '') or '').strip()
        emp['cnae'] = (csv_row.get('CNAE', '') or '').strip()
    else:
        unmatched_new.append((emp['nombre'], best_score, csv_lookup[best_idx][2].get('Nombre empresa', '') if best_idx >= 0 else 'N/A'))

    # Audio matching
    if not emp['audioUrl']:
        audio_norm = normalize_name(emp['nombre'])
        best_audio_score = 0
        best_audio_file = None
        for anorm, afile in audio_map.items():
            s = fuzzy_ratio(audio_norm, anorm)
            # Also check containment (require min 5 chars)
            min_al = min(len(anorm), len(audio_norm))
            if min_al >= 5 and (anorm in audio_norm or audio_norm in anorm):
                s = max(s, 0.85)
            if s > best_audio_score:
                best_audio_score = s
                best_audio_file = afile
        if best_audio_score >= 0.70 and best_audio_file:
            emp['audioUrl'] = f'./audio/{best_audio_file}'

    # Area corrections
    if emp['nombre'] in AREA_CORRECTIONS:
        new_areaId, new_area = AREA_CORRECTIONS[emp['nombre']]
        old_area = emp['area']
        emp['areaId'] = new_areaId
        emp['area'] = new_area
        area_corrections_made.append((emp['nombre'], old_area, new_area))

# Unmatched CSV companies
unmatched_csv = []
for idx, (norm_n, norm_t, row) in enumerate(csv_lookup):
    if idx not in matched_csv_indices:
        unmatched_csv.append(row.get('Nombre empresa', '') or row.get('Title', ''))

# ── Generate new empresas JS ───────────────────────────────────────────────
def escape_js_string(s):
    """Escape a string for use inside JS single quotes."""
    if not s:
        return ''
    s = s.replace('\\', '\\\\')
    s = s.replace("'", "\\'")
    s = s.replace('\n', '\\n')
    s = s.replace('\r', '')
    return s

def format_empresa(emp):
    lines = []
    lines.append('    {')
    lines.append(f"        id: {emp['id']},")
    lines.append(f"        nombre: '{escape_js_string(emp['nombre'])}',")
    lines.append(f"        area: '{escape_js_string(emp['area'])}',")
    lines.append(f"        areaId: '{escape_js_string(emp['areaId'])}',")
    lines.append(f"        descripcion: '{escape_js_string(emp['descripcion'])}',")
    lines.append(f"        sector: '{escape_js_string(emp['sector'])}',")
    lines.append(f"        actividad: '{escape_js_string(emp['actividad'])}',")
    lines.append(f"        direccion: '{escape_js_string(emp['direccion'])}',")
    lines.append(f"        nave: '{escape_js_string(emp['nave'])}',")
    lines.append(f"        cp: '{escape_js_string(emp['cp'])}',")
    lines.append(f"        web: '{escape_js_string(emp['web'])}',")
    lines.append(f"        email: '{escape_js_string(emp['email'])}',")
    lines.append(f"        telefono: '{escape_js_string(emp['telefono'])}',")
    lines.append(f"        cif: '{escape_js_string(emp['cif'])}',")
    lines.append(f"        cnae: '{escape_js_string(emp['cnae'])}',")
    lines.append(f"        streetView: '{escape_js_string(emp['streetView'])}',")
    lines.append(f"        googleMapsUrl: '{escape_js_string(emp['googleMapsUrl'])}',")
    lines.append(f"        audioUrl: '{escape_js_string(emp['audioUrl'])}',")
    lines.append(f"        lat: {emp['lat']},")
    lines.append(f"        lng: {emp['lng']}")
    lines.append('    }')
    return '\n'.join(lines)

empresas_js_entries = ',\n'.join(format_empresa(e) for e in empresas)
new_empresas_section = f"const empresas = [\n{empresas_js_entries}\n];"

# ── Write data.js ──────────────────────────────────────────────────────────
new_content = before_empresas + new_empresas_section + after_empresas

with open(DATA_JS_PATH, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"\ndata.js written successfully!")

# ── Report ─────────────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("MERGE REPORT")
print("=" * 70)

print(f"\nTotal new empresas: {len(empresas)}")
print(f"Total CSV companies: {len(csv_companies)}")
print(f"Matches found: {matched_count}")
print(f"New companies with NO CSV match: {len(unmatched_new)}")
print(f"Old CSV companies with NO new match: {len(unmatched_csv)}")

audio_count = sum(1 for e in empresas if e['audioUrl'])
print(f"Companies with audio: {audio_count}")

print(f"\n--- MATCHED COMPANIES ({matched_count}) ---")
for new_name, old_name, score in sorted(match_details, key=lambda x: x[2]):
    marker = " [LOW]" if score < 0.80 else ""
    print(f"  {score:.2f}  {new_name}  <-->  {old_name}{marker}")

print(f"\n--- NEW COMPANIES WITH NO CSV MATCH ({len(unmatched_new)}) ---")
for name, best_score, closest in unmatched_new:
    print(f"  {name}  (closest: {closest}, score: {best_score:.2f})")

print(f"\n--- OLD CSV COMPANIES WITH NO NEW MATCH ({len(unmatched_csv)}) ---")
for name in sorted(unmatched_csv):
    print(f"  {name}")

print(f"\n--- AREA CORRECTIONS MADE ({len(area_corrections_made)}) ---")
for name, old_area, new_area in area_corrections_made:
    print(f"  {name}: {old_area} -> {new_area}")

print("\nDone!")
