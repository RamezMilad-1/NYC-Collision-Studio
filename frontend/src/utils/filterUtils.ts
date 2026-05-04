import type { CollisionRow, Filters } from '../types';

export function extractStreet(r: CollisionRow): string {
  let sname =
    (r?.ON_STREET_NAME as string) ??
    (r?.['ON STREET NAME'] as string) ??
    (r?.['on_street_name'] as string) ??
    (r?.['onStreet'] as string) ??
    (r?.['ON STREET'] as string) ??
    '';

  if (!sname) {
    const loc = (r?.LOCATION as string) ?? (r?.['location'] as string) ?? '';
    if (typeof loc === 'string' && loc) {
      const mOn = loc.match(/ON\s+([A-Za-z0-9' \-]+)/i);
      if (mOn?.[1]) sname = mOn[1].trim();
      else {
        const mSlash = loc.match(/([A-Za-z0-9' \-]+)\s*\/\s*[A-Za-z0-9' \-]+/);
        if (mSlash?.[1]) sname = mSlash[1].trim();
      }
    }
  }

  if (!sname) return '';
  return typeof sname === 'string' ? sname.trim() : String(sname);
}

export function extractVehicleType(r: CollisionRow): string {
  const vt =
    (r?.['VEHICLE TYPE CODE 1'] as string) ??
    (r?.['VEHICLE_TYPE_CODE_1'] as string) ??
    (r?.['VEHICLE TYPE CODE'] as string) ??
    (r?.['VEHICLE TYPE'] as string) ??
    (r?.['vehicleType'] as string) ??
    (r?.['VEHICLE_TYPE'] as string) ??
    'Unknown';
  return typeof vt === 'string' ? vt : String(vt);
}

export function extractYear(r: CollisionRow): string | null {
  const dt = (r?.CRASH_DATETIME as string) ?? (r?.['crash_datetime'] as string) ?? '';
  if (!dt) return null;
  const year = String(dt).split(' ')[0]?.split('-')[0];
  return year || null;
}

export function rowInjuredCount(r: CollisionRow): number {
  return (
    Number(r?.['NUMBER OF PEDESTRIANS INJURED'] ?? 0) +
    Number(r?.['NUMBER OF CYCLIST INJURED'] ?? 0) +
    Number(r?.['NUMBER OF MOTORIST INJURED'] ?? 0)
  );
}

export function rowKilledCount(r: CollisionRow): number {
  return (
    Number(r?.['NUMBER OF PEDESTRIANS KILLED'] ?? 0) +
    Number(r?.['NUMBER OF CYCLIST KILLED'] ?? 0) +
    Number(r?.['NUMBER OF MOTORIST KILLED'] ?? 0)
  );
}

export function filtersActive(f: Filters): boolean {
  return (
    f.boroughs.length > 0 ||
    f.factors.length > 0 ||
    f.vehicleTypes.length > 0 ||
    f.onStreets.length > 0 ||
    f.years.length > 0 ||
    f.injuredOnly ||
    f.killedOnly
  );
}

export function applyFilters(rows: CollisionRow[], f: Filters): CollisionRow[] {
  if (!filtersActive(f)) return rows;
  return rows.filter((r) => {
    const b = (r?.BOROUGH as string) ?? (r?.['borough'] as string) ?? 'Unknown';
    const factor =
      (r?.['CONTRIBUTING FACTOR VEHICLE 1'] as string) ??
      (r?.['factor'] as string) ??
      'Unknown';
    const vt = extractVehicleType(r);
    const sname = extractStreet(r);
    const year = extractYear(r);
    const injured = rowInjuredCount(r);
    const killed = rowKilledCount(r);

    if (f.boroughs.length && !f.boroughs.includes(b)) return false;
    if (f.factors.length && !f.factors.includes(factor)) return false;
    if (f.vehicleTypes.length && !f.vehicleTypes.includes(vt)) return false;
    if (f.onStreets.length && !f.onStreets.includes(sname)) return false;
    if (f.years.length && (!year || !f.years.includes(year))) return false;
    if (f.injuredOnly && injured <= 0) return false;
    if (f.killedOnly && killed <= 0) return false;
    return true;
  });
}
