import { describe, expect, it, vi } from "vitest";
import { createActor, createAsyncLogic, type SnapshotFrom } from "xstate";
import { placesMachine } from "./placesMachine";

const search = createAsyncLogic({
	run: async () => [{ label: "Damrak 1, Amsterdam", lat: 52.37, lng: 4.89 }],
});

const locate = createAsyncLogic({
	run: async () => ({ lat: 52.09, lng: 5.12 }),
});

const machine = placesMachine.provide({
	actors: {
		searchAddress: search,
		currentLocation: locate,
	},
});

function waitFor(
	actor: ReturnType<typeof createActor<typeof machine>>,
	predicate: (snapshot: SnapshotFrom<typeof machine>) => boolean,
) {
	return new Promise<SnapshotFrom<typeof machine>>((resolve) => {
		if (predicate(actor.getSnapshot())) {
			resolve(actor.getSnapshot());
			return;
		}
		const subscription = actor.subscribe((snapshot) => {
			if (predicate(snapshot)) {
				subscription.unsubscribe();
				resolve(snapshot);
			}
		});
	});
}

function start() {
	const onOffice = vi.fn();
	const onHome = vi.fn();
	const actor = createActor(machine, {
		input: { office: null, home: null, onOffice, onHome },
	}).start();
	return { actor, onOffice, onHome };
}

describe("placesMachine", () => {
	it("searches after an explicit debounce trigger", async () => {
		const { actor } = start();
		actor.send({ type: "OPEN_EDITOR" });
		actor.send({ type: "QUERY_CHANGED", query: "Damrak" });
		expect(
			actor.getSnapshot().matches({ editing: { search: "debouncing" } }),
		).toBe(true);

		actor.send({ type: "SEARCH_TRIGGER" });
		const snapshot = await waitFor(actor, (state) =>
			state.matches({ editing: { search: "success" } }),
		);
		expect(snapshot.context.results[0].label).toContain("Damrak");
		actor.stop();
	});

	it("cancels search when the query becomes too short", () => {
		const { actor } = start();
		actor.send({ type: "OPEN_EDITOR" });
		actor.send({ type: "QUERY_CHANGED", query: "Damrak" });
		actor.send({ type: "QUERY_CHANGED", query: "D" });
		expect(actor.getSnapshot().matches({ editing: { search: "idle" } })).toBe(
			true,
		);
		expect(actor.getSnapshot().context.results).toEqual([]);
		actor.stop();
	});

	it("applies an office choice and notifies the parent", () => {
		const { actor, onOffice } = start();
		const place = { lat: 52.37, lng: 4.89, radiusMeters: 150 };
		actor.send({ type: "SET_OFFICE", place });
		expect(onOffice).toHaveBeenCalledWith(place);
		expect(actor.getSnapshot().context.office).toEqual(place);
		actor.stop();
	});

	it("uses the current location into the office slot", async () => {
		const { actor, onOffice } = start();
		actor.send({ type: "OPEN_EDITOR" });
		actor.send({ type: "LOCATE", label: "Current location" });
		const snapshot = await waitFor(actor, (state) =>
			state.matches({ editing: { locate: "idle" } }),
		);
		expect(onOffice).toHaveBeenCalledWith({
			lat: 52.09,
			lng: 5.12,
			label: "Current location",
			radiusMeters: 150,
		});
		expect(snapshot.context.office?.lat).toBe(52.09);
		actor.stop();
	});

	it("syncs externally reset places", () => {
		const { actor } = start();
		actor.send({
			type: "SYNC",
			office: { lat: 1, lng: 2, radiusMeters: 100 },
			home: null,
		});
		expect(actor.getSnapshot().context.office?.lat).toBe(1);
		actor.stop();
	});
});
