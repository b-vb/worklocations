import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { periodMachine } from "./periodMachine";

const bounds = { min: "2026-01-15", max: "2026-11-15" };

describe("periodMachine", () => {
	it("starts unset and chooses the last 12 months, clamped to data", () => {
		const actor = createActor(periodMachine).start();
		expect(actor.getSnapshot().matches("unset")).toBe(true);
		actor.send({ type: "HISTORY_READY", bounds });
		const snapshot = actor.getSnapshot();
		expect(snapshot.matches("selected")).toBe(true);
		expect(snapshot.context.from).toBe(bounds.min);
		expect(snapshot.context.to).toBe(bounds.max);
		actor.stop();
	});

	it("clamps presets to available data", () => {
		const actor = createActor(periodMachine).start();
		actor.send({ type: "HISTORY_READY", bounds });
		actor.send({ type: "PRESET", preset: "2m" });
		expect(actor.getSnapshot().context.from).toBe("2026-09-14");
		expect(actor.getSnapshot().context.to).toBe(bounds.max);
		actor.stop();
	});

	it("ignores invalid dates and the wrong order", () => {
		const actor = createActor(periodMachine).start();
		actor.send({ type: "HISTORY_READY", bounds });
		actor.send({ type: "FROM_CHANGED", value: "2026-12-01" });
		expect(actor.getSnapshot().context.from).not.toBe("2026-12-01");
		actor.send({ type: "FROM_CHANGED", value: "2026-11-01" });
		actor.send({ type: "TO_CHANGED", value: "2026-10-01" });
		expect(actor.getSnapshot().context.to).toBe(bounds.max);
		actor.send({ type: "TO_CHANGED", value: "" });
		expect(actor.getSnapshot().context.to).toBe(bounds.max);
		actor.stop();
	});

	it("clears back to unset when the dataset closes", () => {
		const actor = createActor(periodMachine).start();
		actor.send({ type: "HISTORY_READY", bounds });
		actor.send({ type: "HISTORY_CLEARED" });
		expect(actor.getSnapshot().matches("unset")).toBe(true);
		expect(actor.getSnapshot().context.bounds).toBeNull();
		actor.stop();
	});

	it("toggles advanced controls", () => {
		const actor = createActor(periodMachine).start();
		actor.send({ type: "TOGGLE_ADVANCED" });
		expect(actor.getSnapshot().context.advanced).toBe(true);
		actor.stop();
	});
});
