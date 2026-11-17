import { setup, types } from "xstate";
import {
	type AppSettings,
	clearStoredSettings,
	defaultSettings,
	loadOverrides,
	loadSettings,
} from "../lib/settings";
import type { Override } from "../lib/timeline/days";

export type PreferencesContext = {
	settings: AppSettings;
	overrides: Record<string, Override>;
};

export type PreferencesEvent =
	| { type: "SETTINGS_PATCH"; patch: Partial<AppSettings> }
	| { type: "SET_OVERRIDE"; date: string; override: Override | undefined }
	| { type: "CLEAR_OVERRIDES" }
	| { type: "RESET_ALL" };

const preferencesSetup = setup({
	schemas: {
		context: types<PreferencesContext>(),
		events: {
			SETTINGS_PATCH: types<{ patch: Partial<AppSettings> }>(),
			SET_OVERRIDE: types<{
				date: string;
				override: Override | undefined;
			}>(),
			CLEAR_OVERRIDES: types<void>(),
			RESET_ALL: types<void>(),
		},
	},
});

export const preferencesMachine = preferencesSetup.createMachine({
	id: "preferences",
	context: () => ({
		settings: loadSettings(),
		overrides: loadOverrides(),
	}),
	initial: "ready",
	states: {
		ready: {
			on: {
				SETTINGS_PATCH: ({ context, event }) => ({
					context: {
						...context,
						settings: { ...context.settings, ...event.patch },
					},
				}),
				SET_OVERRIDE: ({ context, event }) => {
					const overrides = { ...context.overrides };
					if (event.override === undefined) {
						delete overrides[event.date];
					} else {
						overrides[event.date] = event.override;
					}
					return { context: { ...context, overrides } };
				},
				CLEAR_OVERRIDES: ({ context }) => ({
					context: { ...context, overrides: {} },
				}),
				RESET_ALL: ({ context }, enq) => {
					enq(clearStoredSettings);
					return {
						target: "ready",
						context: {
							...context,
							settings: defaultSettings,
							overrides: {},
						},
					};
				},
			},
		},
	},
});
