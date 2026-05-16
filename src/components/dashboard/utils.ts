/**
 * Dashboard utility functions.
 * DashboardBorewell has been removed — the canonical Borewell type from @/types
 * is used throughout. Adapters for cross-section input live in src/lib/adapters.ts.
 */

export async function fetchElevations<T extends { id: string; lat: number; lng: number; elevationFetched?: boolean; groundElevationMSL?: number }>(
  borewells: T[]
): Promise<T[]> {
  const toFetch = borewells.filter(bw => !bw.elevationFetched)
  if (toFetch.length === 0) return borewells
  try {
    const locations = toFetch.map(bw => `${bw.lat},${bw.lng}`).join('|')
    const res = await fetch(`https://api.opentopodata.org/v1/srtm90m?locations=${locations}`)
    const data = await res.json() as { results: { elevation: number }[] }
    const elevMap = new Map<string, number>()
    toFetch.forEach((bw, i) => {
      const el = data.results[i]?.elevation
      if (el != null) elevMap.set(bw.id, el)
    })
    return borewells.map(bw => {
      if (!elevMap.has(bw.id)) return bw
      return { ...bw, groundElevationMSL: elevMap.get(bw.id)!, elevationFetched: true }
    })
  } catch {
    return borewells
  }
}
