import { DAY_MS, dayKey, dayKeyToWallStart, MINUTE_MS } from "./time";
import type { ParsedHistory, ParsedVisit } from "./timeline/types";

/** Small seeded RNG so the demo is stable across reloads. */
function mulberry32(seed: number) {
	let state = seed;
	return () => {
		state |= 0;
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const HOME = { lat: 52.0907, lng: 5.1214, label: "Utrecht" };
const OFFICE = { lat: 52.3567, lng: 4.8736, label: "Amsterdam" };
const OTHER = { lat: 52.0705, lng: 4.3007, label: "Den Haag" };

function at(key: string, hour: number, minute = 0): number {
	return dayKeyToWallStart(key) + hour * 60 * MINUTE_MS + minute * MINUTE_MS;
}

function visit(
	key: string,
	startHour: number,
	endHour: number,
	place: { lat: number; lng: number },
	semanticType: string,
): ParsedVisit {
	const startWall = at(key, startHour);
	const endWall = at(key, endHour);
	return {
		startWall,
		endWall,
		durationMs: endWall - startWall,
		lat: place.lat,
		lng: place.lng,
		semanticType,
		hierarchyLevel: 0,
	};
}

/**
 * Synthetic six-month history: mostly office days with a few home days, one
 * week away, and a gap where Google had no data. Useful for trying the app
 * before dropping in a real export.
 */
export function createDemoHistory(days = 183): ParsedHistory {
	const random = mulberry32(20261116);
	const today = dayKey(Date.now());
	const todayWall = dayKeyToWallStart(today);
	const visits: ParsedVisit[] = [];

	for (let offset = days; offset >= 0; offset -= 1) {
		const key = dayKey(todayWall - offset * DAY_MS);
		const weekday = new Date(dayKeyToWallStart(key)).getUTCDay();
		if (weekday === 0 || weekday === 6) continue;

		// A two-week holiday with no data at all.
		if (offset > 60 && offset < 75) continue;

		// One work-from-another-city day per month-ish.
		if (offset % 23 === 0) {
			visits.push(visit(key, 0, 8, HOME, "HOME"));
			visits.push(visit(key, 9, 17, OTHER, "UNKNOWN"));
			visits.push(visit(key, 18, 23, HOME, "HOME"));
			continue;
		}

		const remoteChance = random();
		if (remoteChance < 0.32) {
			visits.push(visit(key, 0, 12, HOME, "HOME"));
			visits.push(visit(key, 13, 23, HOME, "HOME"));
			continue;
		}

		visits.push(visit(key, 0, 8, HOME, "HOME"));
		const officeStart = 8 + Math.round(random() * 2);
		visits.push(visit(key, officeStart, 17, OFFICE, "WORK"));
		visits.push(visit(key, 18, 23, HOME, "HOME"));

		// A lunch walk nearby, to prove sub-visits do not inflate the total.
		if (random() < 0.3) {
			visits.push({
				startWall: at(key, 12, 15),
				endWall: at(key, 12, 45),
				durationMs: 30 * MINUTE_MS,
				lat: OFFICE.lat + 0.0009,
				lng: OFFICE.lng + 0.0007,
				semanticType: "UNKNOWN",
				hierarchyLevel: 1,
			});
		}
	}

	return {
		visits,
		points: [],
		frequentPlaces: [
			{ ...HOME, label: "HOME" },
			{ ...OFFICE, label: "WORK" },
			{ ...OTHER },
		],
		files: [
			{
				name: "demo-history.json",
				bytes: 0,
				format: "device",
				visits: visits.length,
				points: 0,
			},
		],
		warnings: [],
		range: visits.length
			? {
					startWall: visits[0].startWall,
					endWall: visits[visits.length - 1].endWall,
				}
			: null,
	};
}
