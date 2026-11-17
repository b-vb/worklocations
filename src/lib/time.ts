/**
 * Timeline timestamps come with their own UTC offset, which is what tells us
 * the wall-clock time where the device was. We keep two clocks:
 *
 *  - `utc`  : real epoch milliseconds, used for durations.
 *  - `wall` : "local-as-UTC" milliseconds, used for calendar days and clock
 *             times. Formatting a `wall` value with the UTC getters of a Date
 *             gives exactly the local wall clock it was recorded at.
 *
 * Every day is then always 86_400_000 wall-ms long, even across DST.
 */

export type WallClock = {
	utc: number;
	wall: number;
	offsetMinutes: number;
};

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

const ISO_RE =
	/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|z|([+-])(\d{2}):?(\d{2}))?$/;

function offsetFromSuffix(
	sign: string | undefined,
	hours: string | undefined,
	minutes: string | undefined,
): number {
	if (!sign) return 0;
	const magnitude = Number(hours ?? 0) * 60 + Number(minutes ?? 0);
	return sign === "-" ? -magnitude : magnitude;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

/** Parse an ISO-8601 timestamp (or epoch ms) into both clocks. */
export function parseWallClock(
	value: unknown,
	fallbackOffsetMinutes = 0,
): WallClock | null {
	if (isFiniteNumber(value)) {
		const utc = value;
		return {
			utc,
			wall: utc + fallbackOffsetMinutes * MINUTE_MS,
			offsetMinutes: fallbackOffsetMinutes,
		};
	}

	if (typeof value !== "string" || value.trim() === "") return null;
	const raw = value.trim();

	// Legacy exports sometimes store epoch milliseconds as a numeric string.
	if (/^\d{10,}$/.test(raw)) {
		const utc = Number(raw);
		if (!Number.isFinite(utc)) return null;
		return {
			utc,
			wall: utc + fallbackOffsetMinutes * MINUTE_MS,
			offsetMinutes: fallbackOffsetMinutes,
		};
	}

	const match = ISO_RE.exec(raw);
	if (!match) return null;

	const [
		,
		year,
		month,
		day,
		hour,
		minute,
		second,
		fraction,
		zone,
		sign,
		offHours,
		offMinutes,
	] = match;
	const ms = fraction ? Number(`0.${fraction}`) * 1000 : 0;
	const offsetMinutes = zone
		? offsetFromSuffix(sign, offHours, offMinutes)
		: fallbackOffsetMinutes;

	const utc =
		Date.UTC(
			Number(year),
			Number(month) - 1,
			Number(day),
			Number(hour),
			Number(minute),
			Number(second ?? 0),
			Math.round(ms),
		) -
		offsetMinutes * MINUTE_MS;

	return { utc, wall: utc + offsetMinutes * MINUTE_MS, offsetMinutes };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** YYYY-MM-DD in wall-clock terms. */
export function dayKey(wall: number): string {
	const date = new Date(wall);
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** YYYY-MM-DD for the local date of this device, e.g. for filenames. */
export function localDayKey(date = new Date()): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayStart(wall: number): number {
	const date = new Date(wall);
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function dayKeyToWallStart(key: string): number {
	const [year, month, day] = key.split("-").map(Number);
	return Date.UTC(year, month - 1, day);
}

function dayKeyToDate(key: string): Date {
	return new Date(dayKeyToWallStart(key));
}

/** `HH:mm` in wall-clock terms. */
export function formatClock(wall: number): string {
	const date = new Date(wall);
	return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function weekdayOfDayKey(key: string): number {
	return dayKeyToDate(key).getUTCDay();
}

export function eachDayKey(from: string, to: string, limit = 6000): string[] {
	const keys: string[] = [];
	let cursor = dayKeyToWallStart(from);
	const end = dayKeyToWallStart(to);
	let guard = 0;
	while (cursor <= end && guard < limit) {
		keys.push(dayKey(cursor));
		cursor += DAY_MS;
		guard += 1;
	}
	return keys;
}

export function addDaysKey(key: string, days: number): string {
	return dayKey(dayKeyToWallStart(key) + days * DAY_MS);
}

export function formatDate(key: string, style: "iso" | "dmy" = "iso"): string {
	if (style === "iso") return key;
	const [year, month, day] = key.split("-");
	return `${day}-${month}-${year}`;
}
