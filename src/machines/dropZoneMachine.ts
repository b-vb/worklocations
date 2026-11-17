import { setup, types } from "xstate";

const dropZoneSetup = setup({
	schemas: {
		events: {
			DRAG_ENTER: types<void>(),
			DRAG_LEAVE: types<void>(),
			DROP: types<void>(),
		},
	},
});

export const dropZoneMachine = dropZoneSetup.createMachine({
	id: "drop-zone",
	initial: "idle",
	on: {
		DRAG_ENTER: { target: ".dragging" },
		DRAG_LEAVE: { target: ".idle" },
		DROP: { target: ".idle" },
	},
	states: {
		idle: {},
		dragging: {},
	},
});
