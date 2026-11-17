import { setup, types } from "xstate";
import type { ParseProgress } from "../lib/timeline/load";
import type { ParsedHistory } from "../lib/timeline/types";
import { parserLogic } from "./parser";

type ImportContext = {
	history: ParsedHistory | null;
	progress: ParseProgress | null;
	error: string | null;
	uploaderOpen: boolean;
	detailsOpen: boolean;
	/** Increments on each successful import; useful for one-shot UI effects. */
	completed: number;
	/** Kept only for the running parser actor; cleared on completion. */
	pendingFiles: File[] | null;
};

const idleContext = {
	history: null,
	progress: null,
	error: null,
	uploaderOpen: false,
	detailsOpen: false,
	pendingFiles: null,
} satisfies Omit<ImportContext, "completed">;

const importSetup = setup({
	schemas: {
		context: types<ImportContext>(),
		events: {
			FILES: types<{ files: File[] }>(),
			CANCEL: types<void>(),
			CLOSE: types<void>(),
			OPEN_UPLOADER: types<void>(),
			CLOSE_UPLOADER: types<void>(),
			TOGGLE_DETAILS: types<void>(),
			"parser.progress": types<{ progress: ParseProgress }>(),
			"parser.done": types<{ history: ParsedHistory }>(),
			"parser.aborted": types<void>(),
			"parser.error": types<{ error: string }>(),
		},
	},
	guards: {
		hasHistory: ({ context }) => context.history !== null,
	},
});

export const importMachine = importSetup.createMachine({
	id: "import",
	context: {
		...idleContext,
		completed: 0,
	},
	initial: "idle",
	states: {
		idle: {
			on: {
				FILES: ({ context, event }) => ({
					target: "importing",
					context: {
						...context,
						pendingFiles: event.files,
						error: null,
						progress: null,
						uploaderOpen: true,
					},
				}),
			},
		},

		importing: {
			invoke: {
				id: "parser",
				src: parserLogic,
				input: ({ context }) => ({ files: context.pendingFiles ?? [] }),
			},
			on: {
				"parser.progress": ({ context, event }) => ({
					context: { ...context, progress: event.progress },
				}),
				"parser.done": ({ context, event }) => ({
					target: "ready",
					context: {
						...context,
						history: event.history,
						progress: null,
						error: null,
						uploaderOpen: false,
						detailsOpen: event.history.warnings.length > 0,
						completed: context.completed + 1,
						pendingFiles: null,
					},
				}),
				"parser.error": ({ context, event }) => ({
					target: "error",
					context: {
						...context,
						progress: null,
						error: event.error,
						uploaderOpen: true,
						detailsOpen: false,
						pendingFiles: null,
					},
				}),
				"parser.aborted": ({ context }) => ({
					target: context.history ? "ready" : "idle",
					context: {
						...context,
						progress: null,
						pendingFiles: null,
						uploaderOpen: false,
					},
				}),
				CANCEL: ({ context }) => ({
					target: context.history ? "ready" : "idle",
					context: {
						...context,
						progress: null,
						pendingFiles: null,
						uploaderOpen: false,
						error: null,
					},
				}),
				CLOSE: {
					target: "idle",
					context: { ...idleContext, completed: 0 },
				},
			},
		},

		ready: {
			on: {
				FILES: ({ context, event }) => ({
					target: "importing",
					context: {
						...context,
						pendingFiles: event.files,
						error: null,
						progress: null,
						uploaderOpen: true,
					},
				}),
				OPEN_UPLOADER: ({ context }) => ({
					context: { ...context, uploaderOpen: true },
				}),
				CLOSE_UPLOADER: ({ context }) => ({
					context: { ...context, uploaderOpen: false },
				}),
				TOGGLE_DETAILS: ({ context }) => ({
					context: { ...context, detailsOpen: !context.detailsOpen },
				}),
				CLOSE: {
					target: "idle",
					context: { ...idleContext, completed: 0 },
				},
			},
		},

		error: {
			on: {
				FILES: ({ context, event }) => ({
					target: "importing",
					context: {
						...context,
						pendingFiles: event.files,
						error: null,
						progress: null,
						uploaderOpen: true,
					},
				}),
				OPEN_UPLOADER: ({ context }) => ({
					context: { ...context, uploaderOpen: true },
				}),
				CLOSE_UPLOADER: ({ context }) => ({
					context: { ...context, uploaderOpen: false },
				}),
				TOGGLE_DETAILS: ({ context }) => ({
					context: { ...context, detailsOpen: !context.detailsOpen },
				}),
				CLOSE: {
					target: "idle",
					context: { ...idleContext, completed: 0 },
				},
			},
		},
	},
});
