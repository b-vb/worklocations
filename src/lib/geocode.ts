export type AddressResult = {
	label: string;
	lat: number;
	lng: number;
};

import { asRecord, asString } from "./guards";

type Rec = Record<string, unknown>;

function buildLabel(properties: Rec): string {
	const street = [
		asString(properties.street) ?? "",
		asString(properties.housenumber) ?? "",
	]
		.filter(Boolean)
		.join(" ");
	const city = [
		asString(properties.postcode) ?? "",
		asString(properties.city ?? properties.locality) ?? "",
	]
		.filter(Boolean)
		.join(" ");
	const name = asString(properties.name) ?? "";
	const parts = [name, street, city, asString(properties.country) ?? ""].filter(
		Boolean,
	);
	return parts.join(", ");
}

/**
 * Address → coordinates through Photon (OpenStreetMap). Only the typed address
 * leaves the browser; location history never does.
 */
export async function searchAddress(
	query: string,
	signal?: AbortSignal,
): Promise<AddressResult[]> {
	const trimmed = query.trim();
	if (trimmed.length < 3) return [];

	const url = new URL("https://photon.komoot.io/api/");
	url.searchParams.set("q", trimmed);
	url.searchParams.set("limit", "6");
	url.searchParams.set("lang", "en");

	const response = await fetch(url, { signal });
	if (!response.ok) {
		throw new Error(`Address lookup failed (HTTP ${response.status})`);
	}

	const payload = asRecord(await response.json());
	const results: AddressResult[] = [];
	for (const raw of Array.isArray(payload?.features) ? payload.features : []) {
		const feature = asRecord(raw);
		const geometry = asRecord(feature?.geometry);
		const coordinates = Array.isArray(geometry?.coordinates)
			? geometry.coordinates
			: [];
		const lng = Number(coordinates[0]);
		const lat = Number(coordinates[1]);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
		const label = buildLabel(asRecord(feature?.properties) ?? {});
		if (!label) continue;
		results.push({ label, lat, lng });
	}
	return results;
}

export function currentPosition(): Promise<{ lat: number; lng: number }> {
	return new Promise((resolve, reject) => {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			reject(new Error("Geolocation is not available in this browser."));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(position) =>
				resolve({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				}),
			(error) => reject(new Error(error.message)),
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
		);
	});
}
