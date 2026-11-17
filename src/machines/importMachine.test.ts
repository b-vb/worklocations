import { describe, expect, it } from "vitest";
import { createActor, type SnapshotFrom } from "xstate";
import { importMachine } from "./importMachine";

const timeline = {
	semanticSegments: [
		{
			startTime: "2026-05-04T09:00:00.000+02:00",
			endTime: "2026-05-04T17:00:00.000+02:00",
			visit: {
				topCandidate: {
					semanticType: "WORK",
					placeLocation: { latLng: "52.3567°, 4.8736°" },
				},
			},
		},
	],
};

function makeFile(name = "Timeline.json") {
	return new File([JSON.stringify(timeline)], name, {
		type: "application/json",
	});
}

function waitFor(
	actor: ReturnType<typeof createActor<typeof importMachine>>,
	predicate: (snapshot: SnapshotFrom<typeof importMachine>) => boolean,
) {
	return new Promise<SnapshotFrom<typeof importMachine>>((resolve) => {
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

describe("importMachine", () => {
	it("imports a file and collapses the uploader", async () => {
		const actor = createActor(importMachine).start();
		actor.send({ type: "FILES", files: [makeFile()] });
		expect(actor.getSnapshot().matches("importing")).toBe(true);

		const snapshot = await waitFor(actor, (state) => state.matches("ready"));
		expect(snapshot.context.history?.visits).toHaveLength(1);
		expect(snapshot.context.history?.warnings).toEqual([]);
		expect(snapshot.context.uploaderOpen).toBe(false);
		expect(snapshot.context.detailsOpen).toBe(false);
		expect(snapshot.context.completed).toBe(1);
		expect(snapshot.context.pendingFiles).toBeNull();
		actor.stop();
	});

	it("cancels an import without replacing existing history", async () => {
		const actor = createActor(importMachine).start();
		actor.send({ type: "FILES", files: [makeFile("first.json")] });
		const first = await waitFor(actor, (state) => state.matches("ready"));

		actor.send({ type: "FILES", files: [makeFile("second.json")] });
		expect(actor.getSnapshot().matches("importing")).toBe(true);
		actor.send({ type: "CANCEL" });

		const snapshot = actor.getSnapshot();
		expect(snapshot.matches("ready")).toBe(true);
		expect(snapshot.context.history).toBe(first.context.history);
		expect(snapshot.context.uploaderOpen).toBe(false);
		actor.stop();
	});

	it("closing during a first import leaves the machine idle", async () => {
		const actor = createActor(importMachine).start();
		actor.send({ type: "FILES", files: [makeFile()] });
		actor.send({ type: "CLOSE" });
		expect(actor.getSnapshot().matches("idle")).toBe(true);
		expect(actor.getSnapshot().context.history).toBeNull();
		expect(actor.getSnapshot().context.pendingFiles).toBeNull();
		actor.stop();
	});

	it("reports parser failures and reopens the uploader", async () => {
		const actor = createActor(importMachine).start();
		actor.send({
			type: "FILES",
			files: [new File(["{not json"], "broken.json")],
		});
		const snapshot = await waitFor(actor, (state) => state.matches("ready"));
		expect(snapshot.context.history?.warnings.length).toBeGreaterThan(0);
		expect(snapshot.context.uploaderOpen).toBe(false);
		expect(snapshot.context.detailsOpen).toBe(true);
		actor.stop();
	});

	it("toggles details and the uploader", async () => {
		const actor = createActor(importMachine).start();
		actor.send({ type: "FILES", files: [makeFile()] });
		await waitFor(actor, (state) => state.matches("ready"));
		actor.send({ type: "OPEN_UPLOADER" });
		expect(actor.getSnapshot().context.uploaderOpen).toBe(true);
		actor.send({ type: "TOGGLE_DETAILS" });
		expect(actor.getSnapshot().context.detailsOpen).toBe(true);
		actor.send({ type: "CLOSE_UPLOADER" });
		expect(actor.getSnapshot().context.uploaderOpen).toBe(false);
		actor.stop();
	});
});
