import { toFiniteNumber } from "./guards";

export type LatLng = { lat: number; lng: number };

export type PlaceSetting = LatLng & {
	radiusMeters: number;
	label?: string;
};

const EARTH_RADIUS_M = 6_371_008.8;

export function haversineMeters(a: LatLng, b: LatLng): number {
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const lat1 = (a.lat * Math.PI) / 180;
	const lat2 = (b.lat * Math.PI) / 180;
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isValidLatLng(lat: number, lng: number): boolean {
	return (
		Number.isFinite(lat) &&
		Number.isFinite(lng) &&
		Math.abs(lat) <= 90 &&
		Math.abs(lng) <= 180 &&
		!(lat === 0 && lng === 0)
	);
}

function parseCoordinateString(raw: string): LatLng | null {
	const cleaned = raw.trim().replace(/^geo:/i, "").replace(/°/g, "");
	if (cleaned === "") return null;
	const parts = cleaned.split(",");
	if (parts.length < 2) return null;
	const lat = toFiniteNumber(parts[0]);
	const lng = toFiniteNumber(parts[1]);
	if (lat === null || lng === null) return null;
	return isValidLatLng(lat, lng) ? { lat, lng } : null;
}

/**
 * Accepts every coordinate encoding Google has used so far:
 *  - `"geo:52.1,4.5"` (iOS)
 *  - `"52.1°, 4.5°"` (Android)
 *  - `{ latLng: "..." }` / `{ LatLng: "..." }` (visits, raw signals)
 *  - `{ latitudeE7: 521000000, longitudeE7: 4500000 }` (legacy takeout)
 *  - `{ lat, lng }` / `{ latitude, longitude }`
 */
export function parseLatLng(value: unknown): LatLng | null {
	if (typeof value === "string") return parseCoordinateString(value);
	if (!value || typeof value !== "object") return null;

	const record = value as Record<string, unknown>;

	const latE7 = toFiniteNumber(record.latitudeE7 ?? record.latE7);
	const lngE7 = toFiniteNumber(record.longitudeE7 ?? record.lngE7);
	if (latE7 !== null && lngE7 !== null) {
		const lat = latE7 / 1e7;
		const lng = lngE7 / 1e7;
		return isValidLatLng(lat, lng) ? { lat, lng } : null;
	}

	const nested =
		record.latLng ?? record.LatLng ?? record.location ?? record.placeLocation;
	if (nested !== undefined) {
		const parsed = parseLatLng(nested);
		if (parsed) return parsed;
	}

	const lat = toFiniteNumber(record.lat ?? record.latitude);
	const lng = toFiniteNumber(record.lng ?? record.lon ?? record.longitude);
	if (lat !== null && lng !== null) {
		return isValidLatLng(lat, lng) ? { lat, lng } : null;
	}

	return null;
}

/**
 * Parses what a human might paste into the office field: coordinates, a
 * `geo:` URI, or a Google Maps URL.
 */
export function parseCoordinateInput(input: string): LatLng | null {
	const direct = parseLatLng(input);
	if (direct) return direct;

	const patterns = [
		/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
		/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
		/[?&](?:q|ll|query|center|daddr)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
	];

	for (const pattern of patterns) {
		const match = pattern.exec(input);
		if (!match) continue;
		const lat = Number(match[1]);
		const lng = Number(match[2]);
		if (isValidLatLng(lat, lng)) return { lat, lng };
	}

	return null;
}

export function formatLatLng(point: LatLng, digits = 5): string {
	return `${point.lat.toFixed(digits)}, ${point.lng.toFixed(digits)}`;
}
