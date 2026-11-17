import { haversineMeters, type LatLng, type PlaceSetting } from "../geo";
import type { DayRange } from "../period";
import {
	clampHour,
	DAY_MS,
	dayKey,
	dayKeyToWallStart,
	dayStart,
	eachDayKey,
	MINUTE_MS,
	weekdayOfDayKey,
} from "../time";
import type { ParsedHistory } from "./types";

type Label = "office" | "home" | "other";
export type DayStatus = "office" | "home" | "other" | "no-data" | "pto";
export type Override = "office" | "home" | "other" | "skip" | "pto";

type DaySlice = {
	start: number;
	end: number;
	label: Label;
	minutes: number;
};

type DayRecord = {
	date: string;
	weekday: number;
	officeMinutes: number;
	homeMinutes: number;
	otherMinutes: number;
	totalMinutes: number;
	firstWall: number | null;
	lastWall: number | null;
	status: DayStatus;
	evidence: "visit" | "positions" | "none";
	slices: DaySlice[];
};

export type ClassifySettings = {
	office: PlaceSetting | null;
	home: PlaceSetting | null;
	minOfficeMinutes: number;
	windowStartHour: number;
	windowEndHour: number;
};

export type ClassifyConfig = {
	from: string;
	to: string;
	office: PlaceSetting | null;
	home: PlaceSetting | null;
	minOfficeMinutes: number;
	/** Used for status. Defaults to 07:00–19:00. */
	workWindow?: { startHour: number; endHour: number };
};

export type BuildRowsOptions = {
	workdays: boolean[];
	excludeHolidays: boolean;
	holidays: Map<string, string>;
	overrides: Record<string, Override>;
};

export type DayRow = DayRecord & {
	holiday?: string;
	override?: Override;
	finalStatus: DayStatus;
	included: boolean;
	needsReview: boolean;
	isWorkday: boolean;
};

type Interval = { start: number; end: number; label: Label };

const PRECEDENCE: Record<Label, number> = { office: 3, home: 2, other: 1 };
/** A single breadcrumb stands in for at most this much presence. */
const MAX_POSITION_SLICE = 15 * MINUTE_MS;
const HOUR_MS = 60 * MINUTE_MS;

function labelFor(
	point: LatLng,
	semanticType: string | undefined,
	config: ClassifyConfig,
): Label {
	const { office, home } = config;
	if (office && haversineMeters(point, office) <= office.radiusMeters)
		return "office";
	if (home && haversineMeters(point, home) <= home.radiusMeters) return "home";
	// Home may stay unpinned; rows are not built until an office exists, so
	// Google's HOME label is the only label fallback that can matter.
	if (!home && semanticType === "HOME") return "home";
	return "other";
}

function addInterval(
	map: Map<string, Interval[]>,
	key: string,
	interval: Interval,
) {
	const list = map.get(key);
	if (list) list.push(interval);
	else map.set(key, [interval]);
}

function indexHistory(history: ParsedHistory, config: ClassifyConfig) {
	const visitsByDay = new Map<string, Interval[]>();
	const fromWall = dayKeyToWallStart(config.from);
	const toWall = dayKeyToWallStart(config.to) + DAY_MS;

	for (const visit of history.visits) {
		if (visit.endWall <= fromWall || visit.startWall >= toWall) continue;
		const label = labelFor(visit, visit.semanticType, config);
		let cursor = Math.max(visit.startWall, fromWall);
		const end = Math.min(visit.endWall, toWall);
		let guard = 0;
		while (cursor < end && guard < 400) {
			const nextMidnight = dayStart(cursor) + DAY_MS;
			const sliceEnd = Math.min(end, nextMidnight);
			addInterval(visitsByDay, dayKey(cursor), {
				start: cursor,
				end: sliceEnd,
				label,
			});
			cursor = sliceEnd;
			guard += 1;
		}
	}

	for (const point of history.points) {
		if (point.wall < fromWall || point.wall >= toWall) continue;
		const key = dayKey(point.wall);
		addInterval(visitsByDay, `p:${key}`, {
			start: point.wall,
			end: point.wall,
			label: labelFor(point, undefined, config),
		});
	}

	return { visitsByDay };
}

/**
 * Turns overlapping presence intervals into a clean, non-overlapping timeline.
 * Office wins over home wins over "other" when two sources disagree.
 */
function resolveIntervals(intervals: Interval[]): Interval[] {
	if (intervals.length === 0) return [];
	const sorted = [...intervals].sort((a, b) => a.start - b.start);
	const boundaries = [
		...new Set(sorted.flatMap((interval) => [interval.start, interval.end])),
	].sort((a, b) => a - b);

	const output: Interval[] = [];
	let active: Interval[] = [];
	let cursor = 0;

	for (let index = 0; index < boundaries.length - 1; index += 1) {
		const start = boundaries[index];
		const end = boundaries[index + 1];
		while (cursor < sorted.length && sorted[cursor].start <= start) {
			active.push(sorted[cursor]);
			cursor += 1;
		}
		active = active.filter(
			(interval) => interval.end >= end && interval.start <= start,
		);
		if (active.length === 0) continue;
		let best = active[0];
		for (const interval of active) {
			if (PRECEDENCE[interval.label] > PRECEDENCE[best.label]) best = interval;
		}
		output.push({ start, end, label: best.label });
	}
	return output;
}

function mergeSlices(intervals: Interval[]): DaySlice[] {
	const merged: Interval[] = [];
	for (const interval of intervals) {
		const end = Math.max(interval.end, interval.start + MINUTE_MS);
		const last = merged[merged.length - 1];
		if (
			last &&
			last.label === interval.label &&
			interval.start - last.end <= MINUTE_MS
		) {
			last.end = Math.max(last.end, end);
		} else {
			merged.push({ start: interval.start, end, label: interval.label });
		}
	}
	return merged.map((interval) => ({
		start: interval.start,
		end: interval.end,
		label: interval.label,
		minutes: Math.round((interval.end - interval.start) / MINUTE_MS),
	}));
}

function statusFor(
	officeMinutes: number,
	homeMinutes: number,
	totalMinutes: number,
	minOfficeMinutes: number,
	otherMinutes = 0,
): DayStatus {
	// The place where you spent most of the working day wins; the threshold only
	// keeps a short visit from claiming the whole day.
	if (
		officeMinutes >= minOfficeMinutes &&
		officeMinutes >= homeMinutes &&
		officeMinutes >= otherMinutes
	) {
		return "office";
	}
	if (
		homeMinutes >= minOfficeMinutes &&
		homeMinutes >= officeMinutes &&
		homeMinutes >= otherMinutes
	) {
		return "home";
	}
	if (otherMinutes >= Math.min(minOfficeMinutes, 60)) return "other";
	if (totalMinutes >= 60) return "other";
	return "no-data";
}

/** Maps the persisted settings onto the classification config. */
export function makeClassifyConfig(
	range: DayRange | null,
	settings: ClassifySettings,
): ClassifyConfig | null {
	if (!range) return null;
	return {
		from: range.from,
		to: range.to,
		office: settings.office,
		home: settings.home,
		minOfficeMinutes: settings.minOfficeMinutes,
		workWindow: {
			startHour: settings.windowStartHour,
			endHour: settings.windowEndHour,
		},
	};
}

/** Builds one record per calendar day in the configured range. */
function buildDays(
	history: ParsedHistory,
	config: ClassifyConfig,
): DayRecord[] {
	const { visitsByDay } = indexHistory(history, config);
	const keys = eachDayKey(config.from, config.to);
	const records: DayRecord[] = [];
	const configuredStart = clampHour(config.workWindow?.startHour ?? 7, 7);
	const configuredEnd = clampHour(config.workWindow?.endHour ?? 19, 19);
	const windowStartHour = configuredEnd > configuredStart ? configuredStart : 0;
	const windowEndHour = configuredEnd > configuredStart ? configuredEnd : 24;

	for (const key of keys) {
		const visitIntervals = visitsByDay.get(key) ?? [];
		const pointIntervals = visitsByDay.get(`p:${key}`) ?? [];

		// Breadcrumbs only fill gaps that no visit covers, so the same stretch
		// of time is never counted twice.
		const covered = visitIntervals;
		const pointSlices: Interval[] = [];
		const sortedPoints = [...pointIntervals].sort((a, b) => a.start - b.start);
		for (let index = 0; index < sortedPoints.length; index += 1) {
			const point = sortedPoints[index];
			const next = sortedPoints[index + 1];
			const sliceEnd = Math.min(
				point.start + MAX_POSITION_SLICE,
				next
					? Math.max(next.start, point.start + MINUTE_MS)
					: point.start + MAX_POSITION_SLICE,
			);
			const insideVisit = covered.some(
				(interval) => interval.start < sliceEnd && interval.end > point.start,
			);
			if (insideVisit) continue;
			pointSlices.push({
				start: point.start,
				end: sliceEnd,
				label: point.label,
			});
		}

		const slices = mergeSlices(
			resolveIntervals([...visitIntervals, ...pointSlices]),
		);
		let officeMinutes = 0;
		let homeMinutes = 0;
		let otherMinutes = 0;
		let firstWall: number | null = null;
		let lastWall: number | null = null;
		const midnight = dayKeyToWallStart(key);
		const windowStart = midnight + windowStartHour * HOUR_MS;
		const windowEnd = midnight + windowEndHour * HOUR_MS;

		for (const slice of slices) {
			// Status is decided by time inside working hours. Sleeping at home
			// should not outweigh a full day at a client site.
			const start = Math.max(slice.start, windowStart);
			const end = Math.min(slice.end, windowEnd);
			const minutes = Math.max(0, (end - start) / MINUTE_MS);
			if (slice.label === "office") officeMinutes += minutes;
			else if (slice.label === "home") homeMinutes += minutes;
			else otherMinutes += minutes;
			firstWall =
				firstWall === null ? slice.start : Math.min(firstWall, slice.start);
			lastWall = lastWall === null ? slice.end : Math.max(lastWall, slice.end);
		}

		officeMinutes = Math.round(officeMinutes);
		homeMinutes = Math.round(homeMinutes);
		otherMinutes = Math.round(otherMinutes);
		const totalMinutes = officeMinutes + homeMinutes + otherMinutes;
		const evidence: DayRecord["evidence"] =
			visitIntervals.length > 0 && totalMinutes > 0
				? "visit"
				: pointIntervals.length > 0
					? "positions"
					: "none";

		records.push({
			date: key,
			weekday: weekdayOfDayKey(key),
			officeMinutes,
			homeMinutes,
			otherMinutes,
			totalMinutes,
			firstWall,
			lastWall,
			status: statusFor(
				officeMinutes,
				homeMinutes,
				totalMinutes,
				config.minOfficeMinutes,
				otherMinutes,
			),
			evidence,
			slices,
		});
	}

	return records;
}

export function buildDayRows(
	history: ParsedHistory,
	config: ClassifyConfig,
	options: BuildRowsOptions,
): DayRow[] {
	const records = buildDays(history, config);
	return records.map((record) => {
		const holiday = options.holidays.get(record.date);
		const override = options.overrides[record.date];
		const finalStatus: DayStatus =
			override === "office" ||
			override === "home" ||
			override === "other" ||
			override === "pto"
				? override
				: override === "skip"
					? "no-data"
					: record.status;
		const isWorkday =
			options.workdays[record.weekday] === true &&
			!(options.excludeHolidays && holiday !== undefined);
		const included =
			override === "skip" ? false : override !== undefined ? true : isWorkday;
		const needsReview =
			included &&
			(override === undefined
				? finalStatus === "other" || finalStatus === "no-data"
				: false);

		return {
			...record,
			holiday,
			override,
			finalStatus,
			included,
			needsReview,
			isWorkday,
		};
	});
}

export type PlaceCluster = {
	lat: number;
	lng: number;
	minutes: number;
	days: number;
	label?: string;
};

/**
 * Greedy clustering of visited places by time spent. Used to suggest home and
 * office without asking the user to type coordinates.
 */
export function clusterPlaces(
	history: ParsedHistory,
	maxPlaces = 10,
): PlaceCluster[] {
	const sorted = [...history.visits].sort(
		(a, b) => b.durationMs - a.durationMs,
	);
	const clusters: Array<PlaceCluster & { weight: number }> = [];
	const daysPerCluster: Array<Set<string>> = [];

	for (const visit of sorted) {
		const point = { lat: visit.lat, lng: visit.lng };
		const minutes = visit.durationMs / MINUTE_MS;
		let found = -1;
		for (let index = 0; index < clusters.length; index += 1) {
			if (haversineMeters(point, clusters[index]) <= 120) {
				found = index;
				break;
			}
		}
		if (found === -1) {
			if (clusters.length >= 200) continue;
			clusters.push({ ...point, minutes, days: 0, weight: minutes });
			daysPerCluster.push(new Set([dayKey(visit.startWall)]));
			continue;
		}
		const cluster = clusters[found];
		const total = cluster.weight + minutes;
		cluster.lat =
			(cluster.lat * cluster.weight + point.lat * minutes) / (total || 1);
		cluster.lng =
			(cluster.lng * cluster.weight + point.lng * minutes) / (total || 1);
		cluster.weight = total;
		cluster.minutes += minutes;
		daysPerCluster[found].add(dayKey(visit.startWall));
	}

	clusters.forEach((cluster, index) => {
		cluster.days = daysPerCluster[index].size;
	});

	for (const place of history.frequentPlaces) {
		let best = -1;
		let bestDistance = Number.POSITIVE_INFINITY;
		clusters.forEach((cluster, index) => {
			const distance = haversineMeters(place, cluster);
			if (distance < bestDistance && distance <= 200) {
				best = index;
				bestDistance = distance;
			}
		});
		if (best >= 0 && place.label) {
			clusters[best].label = place.label.toUpperCase();
		}
	}

	return clusters
		.map((cluster) => ({
			lat: cluster.lat,
			lng: cluster.lng,
			minutes: Math.round(cluster.minutes),
			days: cluster.days,
			label: cluster.label,
		}))
		.sort((a, b) => b.minutes - a.minutes)
		.slice(0, maxPlaces);
}

export function suggestPlace(
	clusters: PlaceCluster[],
	kind: "HOME" | "WORK",
	exclude?: LatLng | null,
): PlaceCluster | undefined {
	const labelled = clusters.find((cluster) => cluster.label === kind);
	if (labelled) return labelled;
	const candidates = clusters.filter(
		(cluster) => !exclude || haversineMeters(cluster, exclude) > 300,
	);
	const sorted = [...candidates].sort(
		(a, b) => b.days - a.days || b.minutes - a.minutes,
	);
	return sorted[0];
}

export function summarize(rows: DayRow[]) {
	const included = rows.filter((row) => row.included);
	return {
		days: included.length,
		office: included.filter((row) => row.finalStatus === "office").length,
		home: included.filter((row) => row.finalStatus === "home").length,
		other: included.filter((row) => row.finalStatus === "other").length,
		pto: included.filter((row) => row.finalStatus === "pto").length,
		noData: included.filter((row) => row.finalStatus === "no-data").length,
		review: included.filter((row) => row.needsReview).length,
	};
}

export type SummaryData = ReturnType<typeof summarize>;
