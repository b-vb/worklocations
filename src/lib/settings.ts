import { type CsvOptions, defaultCsvOptions } from "./csv";
import type { PlaceSetting } from "./geo";
import type { Override } from "./timeline/days";

export type { PlaceSetting };

export type AppSettings = {
	office: PlaceSetting | null;
	home: PlaceSetting | null;
	minOfficeMinutes: number;
	/** Only time inside this window decides office/home/other. */
	windowStartHour: number;
	windowEndHour: number;
	/** Index 0 = Sunday, matching Date#getUTCDay(). */
	workdays: boolean[];
	excludeHolidays: boolean;
	csv: CsvOptions;
};

const SETTINGS_KEY = "worklocations.settings.v1";
const OVERRIDES_KEY = "worklocations.overrides.v1";
const LEGACY_SETTINGS_KEY = "afas-commute-log.settings.v1";
const LEGACY_OVERRIDES_KEY = "afas-commute-log.overrides.v1";

const defaultWorkdays = [false, true, true, true, true, true, false];

export const defaultSettings: AppSettings = {
	office: null,
	home: null,
	minOfficeMinutes: 120,
	windowStartHour: 7,
	windowEndHour: 19,
	workdays: defaultWorkdays,
	excludeHolidays: true,
	csv: defaultCsvOptions,
};

function isPlace(value: unknown): value is PlaceSetting {
	if (!value || typeof value !== "object") return false;
	const place = value as Record<string, unknown>;
	return (
		typeof place.lat === "number" &&
		typeof place.lng === "number" &&
		typeof place.radiusMeters === "number"
	);
}

/**
 * Bumped when defaults change in a way that should apply to existing users.
 * v2: weekday and minutes columns are off by default.
 */
const SETTINGS_VERSION = 2;

const CSV_DEFAULTS_V1 = {
	...defaultCsvOptions,
	includeDay: true,
	includeMinutes: true,
};

/**
 * v1 storage cannot tell a user's explicit column choices from the old
 * defaults. If nothing else in the CSV options was customised, apply the new
 * quieter defaults; if the user changed anything else, trust all their choices.
 */
function migrateCsv(csv: CsvOptions): CsvOptions {
	const customizedElsewhere = (
		[
			"delimiter",
			"dateStyle",
			"labels",
			"includeTimes",
			"includeSource",
			"includeNotes",
			"onlyClassified",
			"bom",
		] as const
	).some((key) => csv[key] !== CSV_DEFAULTS_V1[key]);
	if (customizedElsewhere) return csv;
	return {
		...csv,
		includeDay: defaultCsvOptions.includeDay,
		includeMinutes: defaultCsvOptions.includeMinutes,
	};
}

export function loadSettings(): AppSettings {
	if (typeof localStorage === "undefined") return defaultSettings;
	try {
		const raw =
			localStorage.getItem(SETTINGS_KEY) ??
			localStorage.getItem(LEGACY_SETTINGS_KEY);
		if (!raw) return defaultSettings;
		const parsed = JSON.parse(raw) as Partial<AppSettings> & {
			version?: number;
		};
		const version = typeof parsed.version === "number" ? parsed.version : 1;
		const { version: _version, ...stored } = parsed;
		return {
			...defaultSettings,
			...stored,
			office: isPlace(stored.office) ? stored.office : null,
			home: isPlace(stored.home) ? stored.home : null,
			workdays:
				Array.isArray(stored.workdays) && stored.workdays.length === 7
					? stored.workdays.map(Boolean)
					: defaultWorkdays,
			windowStartHour:
				typeof stored.windowStartHour === "number" ? stored.windowStartHour : 7,
			windowEndHour:
				typeof stored.windowEndHour === "number" ? stored.windowEndHour : 19,
			csv:
				version >= SETTINGS_VERSION
					? { ...defaultCsvOptions, ...(stored.csv ?? {}) }
					: migrateCsv({ ...defaultCsvOptions, ...(stored.csv ?? {}) }),
		};
	} catch {
		return defaultSettings;
	}
}

function isDefaultSettings(settings: AppSettings): boolean {
	return (
		settings.office === null &&
		settings.home === null &&
		settings.minOfficeMinutes === defaultSettings.minOfficeMinutes &&
		settings.windowStartHour === defaultSettings.windowStartHour &&
		settings.windowEndHour === defaultSettings.windowEndHour &&
		settings.excludeHolidays === defaultSettings.excludeHolidays &&
		JSON.stringify(settings.workdays) === JSON.stringify(defaultWorkdays) &&
		JSON.stringify(settings.csv) === JSON.stringify(defaultCsvOptions)
	);
}

export function saveSettings(settings: AppSettings): void {
	if (typeof localStorage === "undefined") return;
	try {
		// Keep storage empty when nothing differs from the defaults, so "reset"
		// really means "nothing stored".
		if (isDefaultSettings(settings)) {
			localStorage.removeItem(SETTINGS_KEY);
			localStorage.removeItem(LEGACY_SETTINGS_KEY);
			return;
		}
		localStorage.setItem(
			SETTINGS_KEY,
			JSON.stringify({ ...settings, version: SETTINGS_VERSION }),
		);
		localStorage.removeItem(LEGACY_SETTINGS_KEY);
	} catch {
		// Storage can be full or blocked; the app still works without persistence.
	}
}

/** Removes every stored preference: places, working hours, CSV options, overrides. */
export function clearStoredSettings(): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.removeItem(SETTINGS_KEY);
		localStorage.removeItem(OVERRIDES_KEY);
		localStorage.removeItem(LEGACY_SETTINGS_KEY);
		localStorage.removeItem(LEGACY_OVERRIDES_KEY);
	} catch {
		// Nothing useful to do if storage is unavailable.
	}
}

const OVERRIDE_VALUES: Override[] = ["office", "home", "other", "pto", "skip"];

export function loadOverrides(): Record<string, Override> {
	if (typeof localStorage === "undefined") return {};
	try {
		const raw =
			localStorage.getItem(OVERRIDES_KEY) ??
			localStorage.getItem(LEGACY_OVERRIDES_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const result: Record<string, Override> = {};
		for (const [date, value] of Object.entries(parsed)) {
			if (OVERRIDE_VALUES.includes(value as Override))
				result[date] = value as Override;
		}
		return result;
	} catch {
		return {};
	}
}

export function saveOverrides(overrides: Record<string, Override>): void {
	if (typeof localStorage === "undefined") return;
	try {
		if (Object.keys(overrides).length === 0) {
			localStorage.removeItem(OVERRIDES_KEY);
			localStorage.removeItem(LEGACY_OVERRIDES_KEY);
			return;
		}
		localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
		localStorage.removeItem(LEGACY_OVERRIDES_KEY);
	} catch {
		// Ignore quota errors.
	}
}
