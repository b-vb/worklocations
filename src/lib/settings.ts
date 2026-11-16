import { type CsvOptions, defaultCsvOptions } from "./csv";
import type { Override } from "./timeline/days";

export type PlaceSetting = {
	lat: number;
	lng: number;
	label?: string;
	radiusMeters: number;
};

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

const SETTINGS_KEY = "afas-commute-log.settings.v1";
const OVERRIDES_KEY = "afas-commute-log.overrides.v1";

export const defaultWorkdays = [false, true, true, true, true, true, false];

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

export function loadSettings(): AppSettings {
	if (typeof localStorage === "undefined") return defaultSettings;
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return defaultSettings;
		const parsed = JSON.parse(raw) as Partial<AppSettings>;
		return {
			...defaultSettings,
			...parsed,
			office: isPlace(parsed.office) ? parsed.office : null,
			home: isPlace(parsed.home) ? parsed.home : null,
			workdays:
				Array.isArray(parsed.workdays) && parsed.workdays.length === 7
					? parsed.workdays.map(Boolean)
					: defaultWorkdays,
			windowStartHour:
				typeof parsed.windowStartHour === "number" ? parsed.windowStartHour : 7,
			windowEndHour:
				typeof parsed.windowEndHour === "number" ? parsed.windowEndHour : 19,
			csv: { ...defaultCsvOptions, ...(parsed.csv ?? {}) },
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
			return;
		}
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
	} catch {
		// Nothing useful to do if storage is unavailable.
	}
}

const OVERRIDE_VALUES: Override[] = ["office", "home", "other", "skip"];

export function loadOverrides(): Record<string, Override> {
	if (typeof localStorage === "undefined") return {};
	try {
		const raw = localStorage.getItem(OVERRIDES_KEY);
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
			return;
		}
		localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
	} catch {
		// Ignore quota errors.
	}
}
