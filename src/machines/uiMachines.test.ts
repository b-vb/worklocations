import { afterEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { dayTableMachine } from "./dayTableMachine";
import { dropZoneMachine } from "./dropZoneMachine";
import { exportPanelMachine } from "./exportPanelMachine";
import { localDataMachine } from "./localDataMachine";
import { tileProviderMachine } from "./tileProviderMachine";

describe("dayTableMachine", () => {
	it("starts auto and accepts explicit filters", () => {
		const actor = createActor(dayTableMachine).start();
		expect(actor.getSnapshot().matches("auto")).toBe(true);
		actor.send({ type: "SELECT", filter: "all" });
		expect(actor.getSnapshot().matches("all")).toBe(true);
		actor.send({ type: "SELECT", filter: "review" });
		expect(actor.getSnapshot().matches("review")).toBe(true);
		actor.send({ type: "RESET" });
		expect(actor.getSnapshot().matches("auto")).toBe(true);
		actor.stop();
	});
});

describe("exportPanelMachine", () => {
	it("switches views and toggles options", () => {
		const actor = createActor(exportPanelMachine).start();
		expect(actor.getSnapshot().matches("table")).toBe(true);
		actor.send({ type: "SET_VIEW", view: "text" });
		expect(actor.getSnapshot().matches("text")).toBe(true);
		actor.send({ type: "TOGGLE_OPTIONS" });
		expect(actor.getSnapshot().context.optionsOpen).toBe(true);
		actor.send({ type: "TOGGLE_OPTIONS" });
		expect(actor.getSnapshot().context.optionsOpen).toBe(false);
		actor.stop();
	});
});

describe("tileProviderMachine", () => {
	it("falls back after three failures and recovers on a successful tile", () => {
		const actor = createActor(tileProviderMachine).start();
		expect(actor.getSnapshot().matches("primary")).toBe(true);
		actor.send({ type: "TILE_ERROR" });
		actor.send({ type: "TILE_ERROR" });
		expect(actor.getSnapshot().matches("primary")).toBe(true);
		actor.send({ type: "TILE_ERROR" });
		expect(actor.getSnapshot().matches("fallback")).toBe(true);

		actor.send({ type: "TILE_ERROR" });
		actor.send({ type: "TILE_ERROR" });
		actor.send({ type: "TILE_ERROR" });
		expect(actor.getSnapshot().matches("failed")).toBe(true);

		actor.send({ type: "TILE_LOAD" });
		expect(actor.getSnapshot().matches("primary")).toBe(true);
		actor.stop();
	});

	it("resets the failure count after a successful tile", () => {
		const actor = createActor(tileProviderMachine).start();
		actor.send({ type: "TILE_ERROR" });
		actor.send({ type: "TILE_LOAD" });
		actor.send({ type: "TILE_ERROR" });
		actor.send({ type: "TILE_ERROR" });
		expect(actor.getSnapshot().matches("primary")).toBe(true);
		actor.stop();
	});
});

describe("dropZoneMachine", () => {
	it("tracks drag state", () => {
		const actor = createActor(dropZoneMachine).start();
		actor.send({ type: "DRAG_ENTER" });
		expect(actor.getSnapshot().matches("dragging")).toBe(true);
		actor.send({ type: "DRAG_LEAVE" });
		expect(actor.getSnapshot().matches("idle")).toBe(true);
		actor.send({ type: "DRAG_ENTER" });
		actor.send({ type: "DROP" });
		expect(actor.getSnapshot().matches("idle")).toBe(true);
		actor.stop();
	});
});

describe("localDataMachine", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("discovers files and loads one", async () => {
		const onFile = vi.fn();
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url === "/__local-data") {
					return new Response(
						JSON.stringify({ files: [{ name: "demo.json", size: 12 }] }),
						{ status: 200 },
					);
				}
				return new Response('{"semanticSegments":[]}', { status: 200 });
			}),
		);

		const actor = createActor(localDataMachine, {
			input: { onFile },
		}).start();

		await new Promise<void>((resolve) => {
			const subscription = actor.subscribe((snapshot) => {
				if (snapshot.matches("listed")) {
					subscription.unsubscribe();
					resolve();
				}
			});
		});

		expect(actor.getSnapshot().context.files).toHaveLength(1);
		actor.send({ type: "LOAD", name: "demo.json" });

		await new Promise<void>((resolve) => {
			const subscription = actor.subscribe((snapshot) => {
				if (
					snapshot.matches("listed") &&
					snapshot.context.loadingName === null
				) {
					subscription.unsubscribe();
					resolve();
				}
			});
		});

		expect(onFile).toHaveBeenCalledWith(expect.any(File));
		actor.stop();
	});
});
