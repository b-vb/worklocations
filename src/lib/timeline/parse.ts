import { parseLatLng } from "../geo";
import { MINUTE_MS, parseWallClock } from "../time";
import type {
	FileReport,
	FrequentPlace,
	ParsedHistory,
	ParsedPoint,
	ParsedVisit,
	TimelineFormat,
} from "./types";

type Rec = Record<string, unknown>;

function asRec(value: unknown): Rec | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Rec)
		: null;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

export function detectFormat(root: unknown): TimelineFormat | null {
	const rec = asRec(root);

	if (
		rec &&
		(Array.isArray(rec.semanticSegments) ||
			Array.isArray(rec.rawSignals) ||
			asRec(rec.userLocationProfile) !== null)
	) {
		return "device";
	}

	// iOS exports are a bare array of segments. Sample a few entries, because a
	// file can start with a breadcrumb-only segment.
	if (Array.isArray(root)) {
		const looksLikeSegments = root.slice(0, 5).some((entry) => {
			const seg = asRec(entry);
			if (!seg) return false;
			return (
				asString(seg.startTime) !== undefined &&
				(seg.visit !== undefined ||
					seg.activity !== undefined ||
					Array.isArray(seg.timelinePath))
			);
		});
		if (looksLikeSegments) return "device";
	}

	// A single segment object is still usable.
	if (rec && asString(rec.startTime) && (rec.visit || rec.activity)) {
		return "device";
	}

	return null;
}

type SegmentTimes = { startWall: number; endWall: number; durationMs: number };

function segmentTimes(
	seg: Rec,
	warnings: string[],
	context: string,
): SegmentTimes | null {
	const startOffset = asNumber(seg.startTimeTimezoneUtcOffsetMinutes);
	const start = parseWallClock(seg.startTime, startOffset ?? 0);
	if (!start) {
		warnings.push(
			`${context}: a segment has no usable startTime and was skipped.`,
		);
		return null;
	}
	const end =
		parseWallClock(
			seg.endTime,
			asNumber(seg.endTimeTimezoneUtcOffsetMinutes) ?? start.offsetMinutes,
		) ?? start;
	const durationMs = Math.max(0, end.utc - start.utc);
	return {
		startWall: start.wall,
		endWall: start.wall + durationMs,
		durationMs,
	};
}

type Accumulator = {
	visits: ParsedVisit[];
	points: ParsedPoint[];
	frequentPlaces: FrequentPlace[];
	warnings: string[];
};

function addVisit(
	acc: Accumulator,
	times: SegmentTimes,
	location: unknown,
	visitRecord: Rec,
) {
	const point = parseLatLng(location);
	if (!point) {
		acc.warnings.push("A visit had no usable coordinates and was skipped.");
		return;
	}
	// Anything under a minute is noise for our purposes.
	if (times.durationMs < MINUTE_MS) return;
	const topCandidate = asRec(visitRecord.topCandidate);
	acc.visits.push({
		startWall: times.startWall,
		endWall: times.endWall,
		durationMs: times.durationMs,
		lat: point.lat,
		lng: point.lng,
		semanticType: asString(topCandidate?.semanticType)?.toUpperCase(),
		placeId: asString(topCandidate?.placeId ?? topCandidate?.placeID),
		hierarchyLevel: asNumber(visitRecord.hierarchyLevel) ?? 0,
	});
}

function addPath(
	acc: Accumulator,
	seg: Rec,
	startWall: number,
	offsetMinutes: number,
) {
	for (const raw of asArray(seg.timelinePath)) {
		const entry = asRec(raw);
		if (!entry) continue;
		const point = parseLatLng(entry.point ?? entry.latLng);
		if (!point) continue;

		let wall: number | undefined;
		const absolute = parseWallClock(entry.time, offsetMinutes);
		if (absolute) {
			wall = absolute.wall;
		} else {
			const minutes = asNumber(entry.durationMinutesOffsetFromStartTime);
			if (minutes !== undefined) wall = startWall + minutes * MINUTE_MS;
		}
		if (wall === undefined) continue;
		acc.points.push({ wall, lat: point.lat, lng: point.lng });
	}
}

function parseDevice(root: unknown, acc: Accumulator, fileName: string) {
	const rec = asRec(root);
	const segments = Array.isArray(root) ? root : asArray(rec?.semanticSegments);

	for (const raw of segments) {
		const seg = asRec(raw);
		if (!seg) continue;
		const times = segmentTimes(seg, acc.warnings, fileName);
		if (!times) continue;

		const visit = asRec(seg.visit);
		if (visit) {
			addVisit(acc, times, asRec(visit.topCandidate)?.placeLocation, visit);
		}

		if (Array.isArray(seg.timelinePath)) {
			addPath(
				acc,
				seg,
				times.startWall,
				asNumber(seg.startTimeTimezoneUtcOffsetMinutes) ?? 0,
			);
		}
	}

	for (const raw of asArray(rec?.rawSignals)) {
		const position = asRec(asRec(raw)?.position);
		if (!position) continue;
		const point = parseLatLng(position.LatLng ?? position.latLng);
		const time = parseWallClock(position.timestamp, 0);
		if (!point || !time) continue;
		acc.points.push({
			wall: time.wall,
			lat: point.lat,
			lng: point.lng,
			accuracyMeters: asNumber(position.accuracyMeters),
		});
	}

	const profile = asRec(rec?.userLocationProfile);
	for (const raw of asArray(profile?.frequentPlaces)) {
		const place = asRec(raw);
		if (!place) continue;
		const point = parseLatLng(place.placeLocation);
		if (!point) continue;
		acc.frequentPlaces.push({
			lat: point.lat,
			lng: point.lng,
			label: asString(place.label),
			placeId: asString(place.placeId ?? place.placeID),
		});
	}
}

function visitKey(visit: ParsedVisit): string {
	return [
		Math.round(visit.startWall / MINUTE_MS),
		Math.round(visit.endWall / MINUTE_MS),
		visit.lat.toFixed(5),
		visit.lng.toFixed(5),
	].join("|");
}

function dedupeVisits(visits: ParsedVisit[]): ParsedVisit[] {
	const seen = new Map<string, ParsedVisit>();
	for (const visit of visits) {
		const key = visitKey(visit);
		const existing = seen.get(key);
		// Prefer the duplicate that carries Google's own label.
		if (!existing || (!existing.semanticType && visit.semanticType)) {
			seen.set(key, visit);
		}
	}
	return [...seen.values()].sort((a, b) => a.startWall - b.startWall);
}

function dedupePoints(points: ParsedPoint[]): ParsedPoint[] {
	const seen = new Map<string, ParsedPoint>();
	for (const point of points) {
		const key = `${Math.round(point.wall / MINUTE_MS)}|${point.lat.toFixed(5)}|${point.lng.toFixed(5)}`;
		if (!seen.has(key)) seen.set(key, point);
	}
	return [...seen.values()].sort((a, b) => a.wall - b.wall);
}

export type ParseInput = { name: string; bytes: number; text: string };

/**
 * Parses one or more Google Timeline exports: Android `Timeline.json` or
 * iPhone `location-history.json`. Pure function, so it runs both in a Web
 * Worker and tests.
 */
export function parseTimelineJson(inputs: ParseInput[]): ParsedHistory {
	const acc: Accumulator = {
		visits: [],
		points: [],
		frequentPlaces: [],
		warnings: [],
	};
	const files: FileReport[] = [];

	for (const input of inputs) {
		const report: FileReport = {
			name: input.name,
			bytes: input.bytes,
			format: "device",
			visits: 0,
			points: 0,
		};

		let root: unknown;
		try {
			root = JSON.parse(input.text);
		} catch (error) {
			report.error = error instanceof Error ? error.message : "Invalid JSON";
			files.push(report);
			acc.warnings.push(`${input.name}: could not be read as JSON.`);
			continue;
		}

		const format = detectFormat(root);
		if (!format) {
			report.error = "Unrecognised format";
			files.push(report);
			acc.warnings.push(
				`${input.name}: not a Google Timeline export. Supported: Timeline.json (Android) and location-history.json (iPhone).`,
			);
			continue;
		}

		report.format = format;
		const visitsBefore = acc.visits.length;
		const pointsBefore = acc.points.length;

		parseDevice(root, acc, input.name);

		report.visits = acc.visits.length - visitsBefore;
		report.points = acc.points.length - pointsBefore;
		// Only worth a note when other files did produce data, otherwise the
		// global "nothing found" warning below covers it.
		if (inputs.length > 1 && report.visits === 0 && report.points === 0) {
			acc.warnings.push(
				`${input.name}: readable, but it contained no visits or location points.`,
			);
		}
		files.push(report);
	}

	const visits = dedupeVisits(acc.visits);
	const points = dedupePoints(acc.points);

	let range: ParsedHistory["range"] = null;
	for (const visit of visits) {
		if (!range) range = { startWall: visit.startWall, endWall: visit.endWall };
		range.startWall = Math.min(range.startWall, visit.startWall);
		range.endWall = Math.max(range.endWall, visit.endWall);
	}
	for (const point of points) {
		if (!range) range = { startWall: point.wall, endWall: point.wall };
		range.startWall = Math.min(range.startWall, point.wall);
		range.endWall = Math.max(range.endWall, point.wall);
	}

	if (visits.length === 0 && points.length === 0) {
		acc.warnings.push(
			"No visits or location points were found in the selected file(s).",
		);
	}

	return {
		visits,
		points,
		frequentPlaces: acc.frequentPlaces,
		files,
		warnings: [...new Set(acc.warnings)].slice(0, 12),
		range,
	};
}
