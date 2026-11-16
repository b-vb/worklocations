import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultCsvOptions, rowsToCsv } from "../csv";
import { dayKey, formatClock } from "../time";
import { buildDayRows, clusterPlaces, summarize } from "./days";
import { parseTimelineJson } from "./parse";
import type { ParsedHistory } from "./types";

const file = path.resolve(process.cwd(), "data/demo-timeline.json");
const available = fs.existsSync(file);

/**
 * End-to-end check against the demo file in ./data (gitignored). Skipped when
 * the file is absent, so a fresh clone still passes.
 */
describe.skipIf(!available)("demo timeline file", () => {
	const text = available ? fs.readFileSync(file, "utf8") : "";
	const history: ParsedHistory = parseTimelineJson([
		{ name: "demo-timeline.json", bytes: text.length, text },
	]);

	it("parses Android segments", () => {
		expect(history.visits.length).toBeGreaterThan(200);
		expect(history.files[0].format).toBe("device");
		expect(history.range).not.toBeNull();
	});

	it("finds an office and a home cluster", () => {
		const clusters = clusterPlaces(history);
		expect(clusters.length).toBeGreaterThanOrEqual(2);
		expect(clusters.some((cluster) => cluster.label === "WORK")).toBe(true);
		expect(clusters.some((cluster) => cluster.label === "HOME")).toBe(true);
	});

	it("classifies days and writes a CSV", () => {
		const range = history.range;
		if (!range) throw new Error("no range");
		const rows = buildDayRows(
			history,
			{
				from: dayKey(range.startWall),
				to: dayKey(range.endWall),
				office: { lat: 52.3567, lng: 4.8736, radiusMeters: 150 },
				home: { lat: 52.0907, lng: 5.1214, radiusMeters: 120 },
				minOfficeMinutes: 120,
			},
			{
				workdays: [false, true, true, true, true, true, false],
				excludeHolidays: false,
				holidays: new Map(),
				overrides: {},
			},
		);
		const summary = summarize(rows);
		expect(summary.office).toBeGreaterThan(30);
		expect(summary.home).toBeGreaterThan(5);
		expect(summary.other).toBeGreaterThan(0);

		const csv = rowsToCsv(rows, defaultCsvOptions);
		expect(csv.split("\r\n").length).toBeGreaterThan(50);

		// A Saturday must not be in the export.
		const saturday = rows.find((row) => row.weekday === 6);
		expect(saturday ? saturday.included : false).toBe(false);

		// Print a small sample for manual inspection.
		const sample = rows
			.filter((row) => row.included)
			.slice(0, 5)
			.map(
				(row) =>
					`${row.date} ${row.finalStatus.padEnd(7)} office=${row.officeMinutes} home=${row.homeMinutes} ${row.firstWall ? formatClock(row.firstWall) : "-"}..${row.lastWall ? formatClock(row.lastWall) : "-"}`,
			);
		console.log(sample.join("\n"));
	});
});
