import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultCsvOptions } from "./csv";
import {
	clearStoredSettings,
	defaultSettings,
	loadOverrides,
	loadSettings,
	saveOverrides,
	saveSettings,
} from "./settings";

const store = new Map<string, string>();

const mockStorage = {
	getItem: (key: string) => store.get(key) ?? null,
	setItem: (key: string, value: string) => {
		store.set(key, value);
	},
	removeItem: (key: string) => {
		store.delete(key);
	},
	clear: () => {
		store.clear();
	},
	key: (index: number) => [...store.keys()][index] ?? null,
	get length() {
		return store.size;
	},
};

beforeEach(() => {
	store.clear();
	vi.stubGlobal("localStorage", mockStorage);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("settings storage", () => {
	it("does not write anything when settings are still default", () => {
		saveSettings(defaultSettings);
		expect(store.size).toBe(0);
	});

	it("round-trips a pinned office", () => {
		saveSettings({
			...defaultSettings,
			office: { lat: 52.3567, lng: 4.8736, radiusMeters: 150 },
		});
		expect(store.size).toBe(1);
		expect(loadSettings().office?.lat).toBeCloseTo(52.3567);
	});

	it("removes stored settings when they return to defaults", () => {
		saveSettings({ ...defaultSettings, minOfficeMinutes: 240 });
		expect(store.size).toBe(1);
		saveSettings(defaultSettings);
		expect(store.size).toBe(0);
	});

	it("stores and clears manual overrides", () => {
		saveOverrides({ "2026-05-04": "office" });
		expect(loadOverrides()["2026-05-04"]).toBe("office");
		saveOverrides({});
		expect(store.size).toBe(0);
	});

	it("clears settings and overrides in one go", () => {
		saveSettings({
			...defaultSettings,
			office: { lat: 52.3567, lng: 4.8736, radiusMeters: 150 },
		});
		saveOverrides({ "2026-05-04": "home" });
		expect(store.size).toBe(2);
		clearStoredSettings();
		expect(store.size).toBe(0);
		expect(loadSettings().office).toBeNull();
		expect(loadOverrides()).toEqual({});
	});

	it("reads settings saved under the old project name", () => {
		store.set(
			"afas-commute-log.settings.v1",
			JSON.stringify({
				office: { lat: 52.1, lng: 5.1, radiusMeters: 150 },
			}),
		);
		expect(loadSettings().office?.lat).toBe(52.1);
	});

	it("migrates old stored CSV options to the quieter defaults", () => {
		store.set(
			"worklocations.settings.v1",
			JSON.stringify({
				office: { lat: 52.3567, lng: 4.8736, radiusMeters: 150 },
				csv: {
					...defaultCsvOptions,
					includeDay: true,
					includeMinutes: true,
				},
			}),
		);
		const loaded = loadSettings();
		expect(loaded.office?.lat).toBeCloseTo(52.3567);
		expect(loaded.csv.includeDay).toBe(false);
		expect(loaded.csv.includeMinutes).toBe(false);
	});

	it("keeps CSV customisations saved by the current version", () => {
		store.set(
			"worklocations.settings.v1",
			JSON.stringify({
				version: 2,
				csv: { ...defaultCsvOptions, includeMinutes: true },
			}),
		);
		expect(loadSettings().csv.includeMinutes).toBe(true);
	});
});
