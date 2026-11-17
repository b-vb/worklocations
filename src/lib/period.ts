import { DAY_MS, dayKey } from "./time";

export type DayRange = { from: string; to: string };

export type PeriodBounds = { min: string; max: string };

/** The widest date range a parsed history covers. */
export function rangeBounds(startWall: number, endWall: number): PeriodBounds {
	return {
		min: dayKey(startWall),
		max: dayKey(Math.max(startWall, endWall - DAY_MS / 2)),
	};
}
