import { describe, expect, it } from "vitest";
import { buildCsvTable, defaultCsvOptions, rowsToCsv } from "../csv";
import { dutchHolidays } from "../holidays";
import { dayKeyToWallStart, MINUTE_MS } from "../time";
import {
	type BuildRowsOptions,
	buildDayRows,
	type ClassifyConfig,
	clusterPlaces,
	suggestPlace,
	summarize,
} from "./days";
import type { ParsedHistory, ParsedVisit } from "./types";

const HOME = { lat: 52.0907, lng: 5.1214 };
const OFFICE = { lat: 52.3567, lng: 4.8736 };

function visit(
	date: string,
	startHour: number,
	endHour: number,
	place: { lat: number; lng: number },
	semanticType?: string,
): ParsedVisit {
	const startWall = dayKeyToWallStart(date) + startHour * 60 * MINUTE_MS;
	const endWall = dayKeyToWallStart(date) + endHour * 60 * MINUTE_MS;
	return {
		startWall,
		endWall,
		durationMs: endWall - startWall,
		lat: place.lat,
		lng: place.lng,
		semanticType,
		hierarchyLevel: 0,
	};
}

function history(
	visits: ParsedVisit[],
	points: ParsedHistory["points"] = [],
): ParsedHistory {
	return {
		visits,
		points,
		frequentPlaces: [],
		files: [],
		warnings: [],
		range: null,
	};
}

const config: ClassifyConfig = {
	from: "2026-05-04",
	to: "2026-05-08",
	office: { ...OFFICE, radiusMeters: 150 },
	home: { ...HOME, radiusMeters: 120 },
	minOfficeMinutes: 120,
};

const options: BuildRowsOptions = {
	workdays: [false, true, true, true, true, true, false],
	excludeHolidays: false,
	holidays: new Map(),
	overrides: {},
};

describe("buildDayRows", () => {
	it("classifies a normal office day", () => {
		const rows = buildDayRows(
			history([
				visit("2026-05-04", 0, 8, HOME, "HOME"),
				visit("2026-05-04", 9, 17.5, OFFICE, "WORK"),
				visit("2026-05-04", 18, 23, HOME, "HOME"),
			]),
			config,
			options,
		);

		const monday = rows.find((row) => row.date === "2026-05-04");
		expect(monday?.status).toBe("office");
		expect(monday?.officeMinutes).toBe(510);
		expect(monday?.homeMinutes).toBe(120);
		expect(monday?.included).toBe(true);
		expect(monday?.evidence).toBe("visit");
	});

	it("does not double count a nested visit inside the office", () => {
		const rows = buildDayRows(
			history([
				visit("2026-05-04", 9, 17, OFFICE, "WORK"),
				{ ...visit("2026-05-04", 12, 12.5, OFFICE), hierarchyLevel: 1 },
			]),
			config,
			options,
		);
		expect(rows.find((row) => row.date === "2026-05-04")?.officeMinutes).toBe(
			480,
		);
	});

	it("classifies home when the afternoon at home beats a short office morning", () => {
		const rows = buildDayRows(
			history([
				visit("2026-05-04", 8, 9, OFFICE, "WORK"),
				visit("2026-05-04", 9.5, 17, HOME, "HOME"),
			]),
			config,
			options,
		);
		const monday = rows.find((row) => row.date === "2026-05-04");
		expect(monday?.status).toBe("home");
	});

	it("sends short days below both thresholds to review", () => {
		const rows = buildDayRows(
			history([visit("2026-05-04", 9, 10, HOME, "HOME")]),
			config,
			options,
		);
		const monday = rows.find((row) => row.date === "2026-05-04");
		expect(monday?.status).toBe("other");
		expect(monday?.needsReview).toBe(true);
	});

	it("uses home when the office visit is below the threshold", () => {
		const rows = buildDayRows(
			history([
				visit("2026-05-04", 0, 7, HOME, "HOME"),
				visit("2026-05-04", 8, 9.5, OFFICE, "WORK"),
				visit("2026-05-04", 10, 23, HOME, "HOME"),
			]),
			config,
			options,
		);
		const monday = rows.find((row) => row.date === "2026-05-04");
		expect(monday?.officeMinutes).toBe(90);
		expect(monday?.status).toBe("home");
	});

	it("falls back to location points when there are no visits", () => {
		const points = Array.from({ length: 13 }, (_, index) => ({
			wall: dayKeyToWallStart("2026-05-04") + (9 * 60 + index * 10) * MINUTE_MS,
			...HOME,
		}));
		const rows = buildDayRows(history([], points), config, options);
		const monday = rows.find((row) => row.date === "2026-05-04");
		expect(monday?.evidence).toBe("positions");
		expect(monday?.homeMinutes).toBe(135);
		expect(monday?.status).toBe("home");
	});

	it("marks a day without any data as no-data", () => {
		const rows = buildDayRows(history([]), config, options);
		expect(rows.find((row) => row.date === "2026-05-05")?.status).toBe(
			"no-data",
		);
		expect(rows.find((row) => row.date === "2026-05-05")?.included).toBe(true);
		expect(rows.find((row) => row.date === "2026-05-05")?.needsReview).toBe(
			true,
		);
	});

	it("flags days spent at a third place", () => {
		const rows = buildDayRows(
			history([visit("2026-05-06", 9, 18, { lat: 52.0705, lng: 4.3007 })]),
			config,
			options,
		);
		const wednesday = rows.find((row) => row.date === "2026-05-06");
		expect(wednesday?.status).toBe("other");
		expect(wednesday?.needsReview).toBe(true);
	});

	it("prefers a client site over sleeping at home", () => {
		const rows = buildDayRows(
			history([
				visit("2026-05-06", 0, 8, HOME, "HOME"),
				visit("2026-05-06", 9, 17, { lat: 52.0705, lng: 4.3007 }),
				visit("2026-05-06", 18, 23.5, HOME, "HOME"),
			]),
			config,
			options,
		);
		const wednesday = rows.find((row) => row.date === "2026-05-06");
		expect(wednesday?.otherMinutes).toBe(480);
		expect(wednesday?.homeMinutes).toBe(120);
		expect(wednesday?.status).toBe("other");
	});

	it("counts only time inside the working window", () => {
		const rows = buildDayRows(
			history([
				visit("2026-05-06", 4, 8, HOME, "HOME"),
				visit("2026-05-06", 8, 12, OFFICE, "WORK"),
			]),
			config,
			{ ...options, overrides: {} },
		);
		const wednesday = rows.find((row) => row.date === "2026-05-06");
		expect(wednesday?.homeMinutes).toBe(60);
		expect(wednesday?.officeMinutes).toBe(240);
		expect(wednesday?.status).toBe("office");
	});

	it("excludes weekends unless overridden", () => {
		const rows = buildDayRows(
			history([visit("2026-05-09", 10, 15, OFFICE, "WORK")]),
			{ ...config, to: "2026-05-10" },
			options,
		);
		const saturday = rows.find((row) => row.date === "2026-05-09");
		expect(saturday?.included).toBe(false);

		const overridden = buildDayRows(
			history([visit("2026-05-09", 10, 15, OFFICE, "WORK")]),
			{ ...config, to: "2026-05-10" },
			{ ...options, overrides: { "2026-05-09": "office" } },
		);
		expect(overridden.find((row) => row.date === "2026-05-09")?.included).toBe(
			true,
		);
	});

	it("honours manual overrides and skips", () => {
		const rows = buildDayRows(history([]), config, {
			...options,
			overrides: { "2026-05-05": "office", "2026-05-06": "skip" },
		});
		expect(rows.find((row) => row.date === "2026-05-05")?.finalStatus).toBe(
			"office",
		);
		expect(rows.find((row) => row.date === "2026-05-05")?.included).toBe(true);
		expect(rows.find((row) => row.date === "2026-05-06")?.included).toBe(false);
	});

	it("excludes Dutch public holidays when asked", () => {
		const rows = buildDayRows(
			history([visit("2026-05-05", 9, 17, OFFICE, "WORK")]),
			config,
			{
				...options,
				excludeHolidays: true,
				holidays: new Map([["2026-05-05", "Bevrijdingsdag"]]),
			},
		);
		const tuesday = rows.find((row) => row.date === "2026-05-05");
		expect(tuesday?.holiday).toBe("Bevrijdingsdag");
		expect(tuesday?.included).toBe(false);
	});

	it("supports PTO overrides", () => {
		const rows = buildDayRows(history([]), config, {
			...options,
			overrides: { "2026-05-04": "pto" },
		});
		const monday = rows.find((row) => row.date === "2026-05-04");
		expect(monday?.finalStatus).toBe("pto");
		expect(monday?.included).toBe(true);
		expect(monday?.needsReview).toBe(false);
		expect(summarize(rows).pto).toBe(1);

		const omitted = rowsToCsv(rows, defaultCsvOptions);
		expect(omitted).not.toContain("Verlof");

		const included = rowsToCsv(rows, {
			...defaultCsvOptions,
			onlyClassified: false,
		});
		expect(included).toContain("Verlof");
	});

	it("summarises included days", () => {
		const rows = buildDayRows(
			history([
				visit("2026-05-04", 9, 17, OFFICE, "WORK"),
				visit("2026-05-05", 9, 17, HOME, "HOME"),
			]),
			config,
			options,
		);
		const summary = summarize(rows);
		expect(summary.days).toBe(5);
		expect(summary.office).toBe(1);
		expect(summary.home).toBe(1);
		expect(summary.noData).toBe(3);
	});

	it("covers ranges longer than the old two-year cap", () => {
		const rows = buildDayRows(
			history([visit("2011-05-04", 9, 17, OFFICE, "WORK")]),
			{ ...config, from: "2011-01-01", to: "2026-01-01" },
			options,
		);
		expect(rows.length).toBeGreaterThan(5_000);
		expect(rows.find((row) => row.date === "2011-05-04")?.status).toBe(
			"office",
		);
		expect(rows.find((row) => row.date === "2025-06-02")?.status).toBe(
			"no-data",
		);
	});
});

describe("clusterPlaces", () => {
	it("groups visits within 120m and labels them from frequent places", () => {
		const clusters = clusterPlaces({
			...history([
				visit("2026-05-04", 9, 17, OFFICE),
				visit("2026-05-05", 9, 17, { lat: 52.3568, lng: 4.8737 }),
				visit("2026-05-04", 0, 8, HOME),
			]),
			frequentPlaces: [{ ...OFFICE, label: "WORK" }],
		});
		expect(clusters).toHaveLength(2);
		expect(clusters[0].minutes).toBe(960);
		expect(clusters[0].label).toBe("WORK");
		expect(clusters[0].days).toBe(2);
	});

	it("suggests the labelled work place and a different home", () => {
		const clusters = clusterPlaces(
			history([
				visit("2026-05-04", 9, 17, OFFICE),
				visit("2026-05-04", 0, 8, HOME),
			]),
		);
		expect(suggestPlace(clusters, "WORK")?.lat).toBeCloseTo(OFFICE.lat);
		expect(suggestPlace(clusters, "HOME", OFFICE)?.lat).toBeCloseTo(HOME.lat);
	});
});

describe("holidays", () => {
	it("computes Easter-based holidays", () => {
		expect(dutchHolidays(2026).get("2026-04-05")).toBe("Eerste Paasdag");
		expect(dutchHolidays(2026).get("2026-04-06")).toBe("Tweede Paasdag");
		expect(dutchHolidays(2026).get("2026-05-14")).toBe("Hemelvaartsdag");
		expect(dutchHolidays(2024).get("2024-03-31")).toBe("Eerste Paasdag");
	});

	it("moves Koningsdag when 27 April is a Sunday", () => {
		expect(dutchHolidays(2025).get("2025-04-26")).toBe("Koningsdag");
		expect(dutchHolidays(2025).get("2025-04-27")).toBeUndefined();
	});
});

describe("rowsToCsv", () => {
	it("writes a Dutch CSV with a BOM", () => {
		const rows = buildDayRows(
			history([
				visit("2026-05-04", 9, 17, OFFICE, "WORK"),
				visit("2026-05-06", 9, 17, { lat: 52.0705, lng: 4.3007 }),
			]),
			config,
			options,
		);
		const csv = rowsToCsv(rows, { ...defaultCsvOptions, dateStyle: "dmy" });
		const lines = csv
			.replace(/^\uFEFF/, "")
			.trim()
			.split("\r\n");
		expect(lines[0]).toBe("Datum;Locatie;Opmerking");
		expect(lines).toContain("04-05-2026;Kantoor;");
		// "Other" days are excluded by onlyClassified.
		expect(lines.some((line) => line.includes("Anders"))).toBe(false);
	});

	it("quotes cells that contain the delimiter", () => {
		const rows = buildDayRows(
			history([visit("2026-05-04", 9, 17, OFFICE, "WORK")]),
			config,
			{
				...options,
				holidays: new Map([["2026-05-04", "Feest;dag"]]),
			},
		);
		const csv = rowsToCsv(rows, { ...defaultCsvOptions, delimiter: ";" });
		expect(csv).toContain('"Feest;dag"');
	});

	it("can use comma delimiters and English labels", () => {
		const rows = buildDayRows(history([]), config, {
			...options,
			overrides: { "2026-05-04": "home" },
		});
		const csv = rowsToCsv(rows, {
			...defaultCsvOptions,
			delimiter: ",",
			labels: "en",
			bom: false,
		});
		const lines = csv.trim().split("\r\n");
		expect(lines[0]).toBe("Date,Location,Note");
		expect(lines[1]).toBe("2026-05-04,Home,manual");
	});

	it("exposes the same content as the CSV for the table preview", () => {
		const rows = buildDayRows(
			history([
				visit("2026-05-04", 9, 17, OFFICE, "WORK"),
				visit("2026-05-05", 9, 17, HOME, "HOME"),
			]),
			config,
			options,
		);
		const preview = buildCsvTable(rows, {
			...defaultCsvOptions,
			dateStyle: "dmy",
		});
		const csv = rowsToCsv(rows, { ...defaultCsvOptions, dateStyle: "dmy" });

		expect(preview.columns.map((column) => column.header)).toEqual([
			"Datum",
			"Locatie",
			"Opmerking",
		]);
		expect(preview.rows).toHaveLength(2);
		expect(preview.rows[0]).toEqual(["04-05-2026", "Kantoor", ""]);

		const csvLines = csv
			.replace(/^\uFEFF/, "")
			.trim()
			.split("\r\n");
		expect(csvLines).toHaveLength(preview.rows.length + 1);
		expect(csvLines[0].split(";")).toEqual(
			preview.columns.map((column) => column.header),
		);
		expect(csvLines[1].split(";")).toEqual(preview.rows[0]);
	});

	it("keeps table values stable when the delimiter changes", () => {
		const rows = buildDayRows(
			history([visit("2026-05-05", 9, 17, OFFICE, "WORK")]),
			config,
			{
				...options,
				holidays: new Map([["2026-05-05", "Feest;dag"]]),
			},
		);
		const semicolon = buildCsvTable(rows, {
			...defaultCsvOptions,
			delimiter: ";",
		});
		const comma = buildCsvTable(rows, { ...defaultCsvOptions, delimiter: "," });
		expect(comma.rows).toEqual(semicolon.rows);
		expect(comma.rows[0][2]).toBe("Feest;dag");
	});
});
