import { createAsyncLogic, setup, types } from "xstate";

export type LocalFile = { name: string; size: number };

export type LocalDataContext = {
	files: LocalFile[];
	loadingName: string | null;
	error: string | null;
	onFile: (file: File) => void;
};

export type LocalDataInput = { onFile: (file: File) => void };

const discoverLogic = createAsyncLogic<LocalFile[]>({
	run: async ({ signal }) => {
		const response = await fetch("/__local-data", { signal });
		if (!response.ok) return [];
		const payload = (await response.json()) as { files?: LocalFile[] };
		return payload.files ?? [];
	},
});

const loadLogic = createAsyncLogic<File, { name: string }>({
	run: async ({ input, signal }) => {
		const response = await fetch(`/data/${encodeURIComponent(input.name)}`, {
			signal,
		});
		if (!response.ok) {
			throw new Error(`Could not read ${input.name} (${response.status})`);
		}
		const text = await response.text();
		return new File([text], input.name, { type: "application/json" });
	},
});

const localDataSetup = setup({
	schemas: {
		context: types<LocalDataContext>(),
		input: types<LocalDataInput>(),
		events: {
			CHECK: types<void>(),
			LOAD: types<{ name: string }>(),
		},
	},
	actors: {
		discover: discoverLogic,
		loadFile: loadLogic,
	},
});

export const localDataMachine = localDataSetup.createMachine({
	id: "local-data",
	context: ({ input }) => ({
		files: [],
		loadingName: null,
		error: null,
		onFile: input.onFile,
	}),
	initial: "checking",
	states: {
		checking: {
			invoke: {
				id: "discover-local-files",
				src: "discover",
				onDone: ({ context, event }) => ({
					target: event.output.length > 0 ? "listed" : "hidden",
					context: { ...context, files: event.output, error: null },
				}),
				onError: {
					target: "hidden",
				},
			},
		},
		hidden: {
			on: { CHECK: { target: "checking" } },
		},
		listed: {
			on: {
				LOAD: ({ context, event }) => ({
					target: "loading",
					context: {
						...context,
						loadingName: event.name,
						error: null,
					},
				}),
				CHECK: { target: "checking" },
			},
		},
		loading: {
			invoke: {
				id: "load-local-file",
				src: "loadFile",
				input: ({ context }) => ({ name: context.loadingName ?? "" }),
				onDone: ({ context, event }, enq) => {
					enq(() => context.onFile(event.output));
					return {
						target: "listed",
						context: { ...context, loadingName: null },
					};
				},
				onError: ({ context, event }) => ({
					target: "failure",
					context: {
						...context,
						loadingName: null,
						error:
							event.error instanceof Error
								? event.error.message
								: String(event.error),
					},
				}),
			},
		},
		failure: {
			on: {
				LOAD: ({ context, event }) => ({
					target: "loading",
					context: {
						...context,
						loadingName: event.name,
						error: null,
					},
				}),
				CHECK: { target: "checking" },
			},
		},
	},
});
