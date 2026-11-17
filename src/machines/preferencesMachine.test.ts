import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { defaultSettings, saveSettings } from "../lib/settings";
import { preferencesMachine } from "./preferencesMachine";

const store = new Map<string, string>();

const mockStorage = {
	getItem: (key: string) => store.get(key) ?? null,
	setItem: (key: string, value: string) => {
		store.set(key, value);
	},
	removeItem: (key: string) => {
		store.delete(key);
	},
	clear: () => store.clear(),
	key: (index: number) => [...store.keys()][index] ?? null,
	get length() {
		return store.size;
	},
};

beforeEach(() => {
	store.clear();
	vi.stubGlobal("localStorage", mockStorage);
});

afterEach(() => vi.unstubAllGlobals());

describe("preferencesMachine", () => {
	it("loads stored settings and applies patches", () => {
		saveSettings({
			...defaultSettings,
			office: { lat: 52.1, lng: 5.1, radiusMeters: 150 },
		});
		const actor = createActor(preferencesMachine).start();
		expect(actor.getSnapshot().context.settings.office?.lat).toBe(52.1);

		actor.send({
			type: "SETTINGS_PATCH",
			patch: { minOfficeMinutes: 60 },
		});
		expect(actor.getSnapshot().context.settings.minOfficeMinutes).toBe(60);
		actor.stop();
	});

	it("sets and clears day overrides", () => {
		const actor = createActor(preferencesMachine).start();
		actor.send({
			type: "SET_OVERRIDE",
			date: "2026-05-04",
			override: "office",
		});
		expect(actor.getSnapshot().context.overrides["2026-05-04"]).toBe("office");
		actor.send({
			type: "SET_OVERRIDE",
			date: "2026-05-04",
			override: undefined,
		});
		expect(actor.getSnapshot().context.overrides["2026-05-04"]).toBeUndefined();
		actor.send({ type: "SET_OVERRIDE", date: "2026-05-05", override: "home" });
		actor.send({ type: "CLEAR_OVERRIDES" });
		expect(actor.getSnapshot().context.overrides).toEqual({});
		actor.stop();
	});

	it("resets context and clears storage", () => {
		saveSettings({
			...defaultSettings,
			office: { lat: 52.1, lng: 5.1, radiusMeters: 150 },
		});
		const actor = createActor(preferencesMachine).start();
		actor.send({
			type: "SET_OVERRIDE",
			date: "2026-05-04",
			override: "office",
		});

		actor.send({ type: "RESET_ALL" });
		expect(actor.getSnapshot().context.settings.office).toBeNull();
		expect(actor.getSnapshot().context.overrides).toEqual({});
		expect(store.size).toBe(0);
		actor.stop();
	});
});
