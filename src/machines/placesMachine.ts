import { createAsyncLogic, setup, types } from "xstate";
import { parseCoordinateInput } from "../lib/geo";
import {
	type AddressResult,
	currentPosition,
	searchAddress,
} from "../lib/geocode";
import type { PlaceSetting } from "../lib/settings";

type PlacesContext = {
	office: PlaceSetting | null;
	home: PlaceSetting | null;
	pickTarget: "office" | "home";
	query: string;
	results: AddressResult[];
	searchError: string | null;
	locateError: string | null;
	pendingLabel: string;
	onOffice: (place: PlaceSetting | null) => void;
	onHome: (place: PlaceSetting | null) => void;
};

type PlacesInput = {
	office: PlaceSetting | null;
	home: PlaceSetting | null;
	onOffice: (place: PlaceSetting | null) => void;
	onHome: (place: PlaceSetting | null) => void;
};

const searchLogic = createAsyncLogic<AddressResult[], { query: string }>({
	run: ({ input, signal }) => searchAddress(input.query, signal),
});

const locationLogic = createAsyncLogic<{ lat: number; lng: number }>({
	run: () => currentPosition(),
});

function canSearch(query: string): boolean {
	const trimmed = query.trim();
	return trimmed.length >= 3 && parseCoordinateInput(trimmed) === null;
}

const placesSetup = setup({
	schemas: {
		context: types<PlacesContext>(),
		input: types<PlacesInput>(),
		events: {
			OPEN_EDITOR: types<void>(),
			CLOSE_EDITOR: types<void>(),
			SET_PICK_TARGET: types<{ target: "office" | "home" }>(),
			SYNC: types<{
				office: PlaceSetting | null;
				home: PlaceSetting | null;
			}>(),
			QUERY_CHANGED: types<{ query: string }>(),
			SEARCH_TRIGGER: types<void>(),
			SEARCH_RETRY: types<void>(),
			LOCATE: types<{ label: string }>(),
			LOCATE_RETRY: types<void>(),
			SET_OFFICE: types<{ place: PlaceSetting }>(),
			SET_HOME: types<{ place: PlaceSetting }>(),
			CLEAR_OFFICE: types<void>(),
			CLEAR_HOME: types<void>(),
		},
	},
	actors: {
		searchAddress: searchLogic,
		currentLocation: locationLogic,
	},
});

export const placesMachine = placesSetup.createMachine({
	id: "places",
	context: ({ input }) => ({
		office: input.office,
		home: input.home,
		pickTarget: "office",
		query: "",
		results: [],
		searchError: null,
		locateError: null,
		pendingLabel: "",
		onOffice: input.onOffice,
		onHome: input.onHome,
	}),
	initial: "suggestions",
	states: {
		suggestions: {
			on: {
				OPEN_EDITOR: { target: "editing" },
				SYNC: ({ context, event }) => ({
					context: {
						...context,
						office: event.office,
						home: event.home,
					},
				}),
				SET_OFFICE: ({ context, event }, enq) => {
					enq(() => context.onOffice(event.place));
					return {
						context: {
							...context,
							office: event.place,
							query: "",
							results: [],
						},
					};
				},
				SET_HOME: ({ context, event }, enq) => {
					enq(() => context.onHome(event.place));
					return { context: { ...context, home: event.place } };
				},
				CLEAR_OFFICE: ({ context }, enq) => {
					enq(() => context.onOffice(null));
					return { context: { ...context, office: null } };
				},
				CLEAR_HOME: ({ context }, enq) => {
					enq(() => context.onHome(null));
					return { context: { ...context, home: null } };
				},
			},
		},

		editing: {
			type: "parallel",
			on: {
				CLOSE_EDITOR: { target: "suggestions" },
				SYNC: ({ context, event }) => ({
					context: {
						...context,
						office: event.office,
						home: event.home,
					},
				}),
				SET_PICK_TARGET: ({ context, event }) => ({
					context: { ...context, pickTarget: event.target },
				}),
				SET_OFFICE: ({ context, event }, enq) => {
					enq(() => context.onOffice(event.place));
					return {
						context: {
							...context,
							office: event.place,
							query: "",
							results: [],
						},
					};
				},
				SET_HOME: ({ context, event }, enq) => {
					enq(() => context.onHome(event.place));
					return { context: { ...context, home: event.place } };
				},
				CLEAR_OFFICE: ({ context }, enq) => {
					enq(() => context.onOffice(null));
					return { context: { ...context, office: null } };
				},
				CLEAR_HOME: ({ context }, enq) => {
					enq(() => context.onHome(null));
					return { context: { ...context, home: null } };
				},
			},
			states: {
				search: {
					initial: "idle",
					on: {
						QUERY_CHANGED: ({ context, event }, enq) => {
							enq.cancel("search-debounce");
							const query = event.query;
							if (!canSearch(query)) {
								return {
									target: ".idle",
									context: {
										...context,
										query,
										results: [],
										searchError: null,
									},
								};
							}
							enq.raise(
								{ type: "SEARCH_TRIGGER" },
								{ delay: 400, id: "search-debounce" },
							);
							return {
								target: ".debouncing",
								context: { ...context, query, searchError: null },
							};
						},
					},
					states: {
						idle: {},
						debouncing: {
							on: { SEARCH_TRIGGER: { target: "searching" } },
						},
						searching: {
							invoke: {
								id: "address-search",
								src: "searchAddress",
								input: ({ context }) => ({ query: context.query.trim() }),
								onDone: ({ context, event }) => ({
									target:
										event.output.length > 0 ? "#searchSuccess" : "#searchEmpty",
									context: {
										...context,
										results: event.output,
										searchError: null,
									},
								}),
								onError: ({ context, event }) => ({
									target: "#searchFailure",
									context: {
										...context,
										searchError:
											event.error instanceof Error
												? event.error.message
												: String(event.error),
									},
								}),
							},
						},
						success: { id: "searchSuccess" },
						empty: { id: "searchEmpty" },
						failure: {
							id: "searchFailure",
							on: { SEARCH_RETRY: { target: "searching" } },
						},
					},
				},

				locate: {
					initial: "idle",
					states: {
						idle: {
							on: {
								LOCATE: ({ context, event }) => ({
									target: "locating",
									context: {
										...context,
										locateError: null,
										pendingLabel: event.label,
									},
								}),
							},
						},
						locating: {
							invoke: {
								id: "current-location",
								src: "currentLocation",
								onDone: ({ context, event }, enq) => {
									const place: PlaceSetting = {
										lat: event.output.lat,
										lng: event.output.lng,
										label: context.pendingLabel,
										radiusMeters: context.office?.radiusMeters ?? 150,
									};
									enq(() => context.onOffice(place));
									return {
										target: "idle",
										context: { ...context, office: place },
									};
								},
								onError: ({ context, event }) => ({
									target: "failure",
									context: {
										...context,
										locateError:
											event.error instanceof Error
												? event.error.message
												: String(event.error),
									},
								}),
							},
						},
						failure: {
							on: {
								LOCATE_RETRY: { target: "locating" },
								LOCATE: ({ context, event }) => ({
									target: "locating",
									context: {
										...context,
										locateError: null,
										pendingLabel: event.label,
									},
								}),
							},
						},
					},
				},
			},
		},
	},
});
