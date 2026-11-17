import { setup, types } from "xstate";

type TileContext = { failures: number };

const tileSetup = setup({
	schemas: {
		context: types<TileContext>(),
		events: {
			TILE_ERROR: types<void>(),
			TILE_LOAD: types<void>(),
		},
	},
});

export const tileProviderMachine = tileSetup.createMachine({
	id: "tile-provider",
	context: { failures: 0 },
	initial: "primary",
	states: {
		primary: {
			on: {
				TILE_ERROR: ({ context }) =>
					context.failures >= 2
						? { target: "fallback", context: { failures: 0 } }
						: { context: { failures: context.failures + 1 } },
				TILE_LOAD: { context: { failures: 0 } },
			},
		},
		fallback: {
			on: {
				TILE_ERROR: ({ context }) =>
					context.failures >= 2
						? { target: "failed", context: { failures: 0 } }
						: { context: { failures: context.failures + 1 } },
				TILE_LOAD: { context: { failures: 0 } },
			},
		},
		failed: {
			on: {
				TILE_ERROR: {},
				TILE_LOAD: { target: "primary", context: { failures: 0 } },
			},
		},
	},
});
