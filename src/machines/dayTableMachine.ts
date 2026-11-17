import { setup, types } from "xstate";

export type DayFilter = "auto" | "review" | "workdays" | "all";

const dayTableSetup = setup({
	schemas: {
		events: {
			SELECT: types<{ filter: Exclude<DayFilter, "auto"> }>(),
			RESET: types<void>(),
		},
	},
});

export const dayTableMachine = dayTableSetup.createMachine({
	id: "day-table",
	initial: "auto",
	on: {
		SELECT: ({ event }) => ({ target: `.${event.filter}` }),
		RESET: { target: ".auto" },
	},
	states: {
		auto: {},
		review: {},
		workdays: {},
		all: {},
	},
});
