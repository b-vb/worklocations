import { setup, types } from "xstate";

export type ExportView = "table" | "text";

export type ExportPanelContext = { optionsOpen: boolean };

type ExportPanelEvent =
	| { type: "SET_VIEW"; view: ExportView }
	| { type: "TOGGLE_OPTIONS" };

const exportSetup = setup({
	schemas: {
		context: types<ExportPanelContext>(),
		events: {
			SET_VIEW: types<{ view: ExportView }>(),
			TOGGLE_OPTIONS: types<void>(),
		},
	},
});

export const exportPanelMachine = exportSetup.createMachine({
	id: "export-panel",
	context: { optionsOpen: false },
	initial: "table",
	on: {
		SET_VIEW: ({ event }) => ({ target: `.${event.view}` }),
		TOGGLE_OPTIONS: ({ context }) => ({
			context: { ...context, optionsOpen: !context.optionsOpen },
		}),
	},
	states: {
		table: {},
		text: {},
	},
});

export type { ExportPanelEvent };
