import { setup, types } from "xstate";

type DayFilter = "auto" | "review" | "workdays" | "all";

const dayTableSetup = setup({
	schemas: {
		events: {
			SELECT: types<{ filter: Exclude<DayFilter, "auto"> }>(),
		},
	},
});

export const dayTableMachine = dayTableSetup.createMachine({
	id: "day-table",
	initial: "auto",
	on: {
		SELECT: ({ event }) => ({ target: `.${event.filter}` }),
	},
	states: {
		auto: {},
		review: {},
		workdays: {},
		all: {},
	},
});
