import { setup, types } from "xstate";
import { addDaysKey, dayKeyToWallStart } from "../lib/time";

export type PeriodBounds = { min: string; max: string };

export type PeriodPreset = "2m" | "6m" | "12m" | "year" | "all";

export type PeriodContext = {
	bounds: PeriodBounds | null;
	from: string;
	to: string;
	advanced: boolean;
};

export type PeriodEvent =
	| { type: "HISTORY_READY"; bounds: PeriodBounds }
	| { type: "HISTORY_CLEARED" }
	| { type: "FROM_CHANGED"; value: string }
	| { type: "TO_CHANGED"; value: string }
	| { type: "PRESET"; preset: PeriodPreset }
	| { type: "TOGGLE_ADVANCED" };

const emptyContext: PeriodContext = {
	bounds: null,
	from: "",
	to: "",
	advanced: false,
};

function isValidDay(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const wall = dayKeyToWallStart(value);
	return Number.isFinite(wall) && !Number.isNaN(new Date(wall).getTime());
}

function defaultRange(bounds: PeriodBounds): { from: string; to: string } {
	const twelveMonthsAgo = addDaysKey(bounds.max, -365);
	return {
		from: twelveMonthsAgo < bounds.min ? bounds.min : twelveMonthsAgo,
		to: bounds.max,
	};
}

function presetRange(
	bounds: PeriodBounds,
	preset: PeriodPreset,
): {
	from: string;
	to: string;
} {
	if (preset === "all") return { from: bounds.min, to: bounds.max };

	const days =
		preset === "2m"
			? -62
			: preset === "6m"
				? -183
				: preset === "12m"
					? -365
					: 0;
	const from =
		preset === "year"
			? `${bounds.max.slice(0, 4)}-01-01`
			: addDaysKey(bounds.max, days);

	return {
		from:
			from < bounds.min ? bounds.min : from > bounds.max ? bounds.max : from,
		to: bounds.max,
	};
}

const periodSetup = setup({
	schemas: {
		context: types<PeriodContext>(),
		events: {
			HISTORY_READY: types<{ bounds: PeriodBounds }>(),
			HISTORY_CLEARED: types<void>(),
			FROM_CHANGED: types<{ value: string }>(),
			TO_CHANGED: types<{ value: string }>(),
			PRESET: types<{ preset: PeriodPreset }>(),
			TOGGLE_ADVANCED: types<void>(),
		},
	},
});

export const periodMachine = periodSetup.createMachine({
	id: "period",
	context: emptyContext,
	initial: "unset",
	states: {
		unset: {
			on: {
				HISTORY_CLEARED: {},
				HISTORY_READY: ({ event }) => ({
					target: "selected",
					context: {
						bounds: event.bounds,
						...defaultRange(event.bounds),
						advanced: false,
					},
				}),
				TOGGLE_ADVANCED: ({ context }) => ({
					context: { ...context, advanced: !context.advanced },
				}),
			},
		},
		selected: {
			on: {
				HISTORY_READY: ({ event }) => ({
					context: {
						bounds: event.bounds,
						...defaultRange(event.bounds),
						advanced: false,
					},
				}),
				HISTORY_CLEARED: {
					target: "unset",
					context: emptyContext,
				},
				FROM_CHANGED: ({ context, event }) => {
					if (
						!context.bounds ||
						!isValidDay(event.value) ||
						event.value > context.to ||
						event.value < context.bounds.min ||
						event.value > context.bounds.max
					) {
						return;
					}
					return { context: { ...context, from: event.value } };
				},
				TO_CHANGED: ({ context, event }) => {
					if (
						!context.bounds ||
						!isValidDay(event.value) ||
						event.value < context.from ||
						event.value < context.bounds.min ||
						event.value > context.bounds.max
					) {
						return;
					}
					return { context: { ...context, to: event.value } };
				},
				PRESET: ({ context, event }) => {
					if (!context.bounds) return;
					return {
						context: {
							...context,
							...presetRange(context.bounds, event.preset),
						},
					};
				},
				TOGGLE_ADVANCED: ({ context }) => ({
					context: { ...context, advanced: !context.advanced },
				}),
			},
		},
	},
});
