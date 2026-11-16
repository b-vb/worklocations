import { describe, expect, it } from "vitest";
import { dayKey, formatClock } from "../time";
import { detectFormat, type ParseInput, parseTimelineJson } from "./parse";
import type { ParsedHistory } from "./types";

function parse(json: unknown, name = "Timeline.json"): ParsedHistory {
	const text = typeof json === "string" ? json : JSON.stringify(json);
	const input: ParseInput = { name, bytes: text.length, text };
	return parseTimelineJson([input]);
}

const android = {
	semanticSegments: [
		{
			startTime: "2026-05-04T00:10:00.000+02:00",
			endTime: "2026-05-04T08:20:00.000+02:00",
			startTimeTimezoneUtcOffsetMinutes: 120,
			visit: {
				hierarchyLevel: 0,
				probability: 0.9,
				topCandidate: {
					placeId: "home-place",
					semanticType: "HOME",
					probability: 0.9,
					placeLocation: { latLng: "52.0907°, 5.1214°" },
				},
			},
		},
		{
			startTime: "2026-05-04T09:00:00.000+02:00",
			endTime: "2026-05-04T17:30:00.000+02:00",
			visit: {
				hierarchyLevel: 0,
				topCandidate: {
					placeId: "work-place",
					semanticType: "WORK",
					placeLocation: { latLng: "52.3567°, 4.8736°" },
				},
			},
		},
		{
			startTime: "2026-05-04T18:00:00.000+02:00",
			endTime: "2026-05-04T23:50:00.000+02:00",
			visit: {
				topCandidate: {
					semanticType: "HOME",
					placeLocation: { latLng: "52.0907°, 5.1214°" },
				},
			},
		},
		{
			startTime: "2026-05-05T00:00:00.000+02:00",
			endTime: "2026-05-05T06:00:00.000+02:00",
			timelinePath: [
				{ point: "52.0907°, 5.1214°", time: "2026-05-05T00:05:00.000+02:00" },
				{ point: "52.0907°, 5.1214°", time: "2026-05-05T05:55:00.000+02:00" },
			],
		},
	],
	rawSignals: [
		{
			position: {
				LatLng: "52.0907°, 5.1214°",
				accuracyMeters: 10,
				timestamp: "2026-05-05T12:00:00.000+02:00",
			},
		},
	],
	userLocationProfile: {
		frequentPlaces: [
			{
				placeId: "home-place",
				placeLocation: "52.0907°, 5.1214°",
				label: "HOME",
			},
		],
	},
};

describe("detectFormat", () => {
	it("recognises Android, iOS, legacy and Records shapes", () => {
		expect(detectFormat(android)).toBe("device");
		expect(
			detectFormat([{ startTime: "2026-01-01T00:00:00Z", visit: {} }]),
		).toBe("device");
		expect(detectFormat({ timelineObjects: [] })).toBe("legacy");
		expect(detectFormat({ locations: [] })).toBe("records");
		expect(detectFormat({ hello: "world" })).toBeNull();
	});
});

describe("Android export", () => {
	const history = parse(android);

	it("keeps visits and reads local wall-clock times", () => {
		expect(history.visits).toHaveLength(3);
		expect(dayKey(history.visits[1].startWall)).toBe("2026-05-04");
		expect(formatClock(history.visits[1].startWall)).toBe("09:00");
		expect(history.visits[1].durationMs).toBe(8.5 * 3_600_000);
		expect(history.visits[1].semanticType).toBe("WORK");
	});

	it("reads timeline breadcrumbs and raw signals", () => {
		expect(history.points).toHaveLength(3);
		expect(formatClock(history.points[0].wall)).toBe("00:05");
		expect(formatClock(history.points[2].wall)).toBe("12:00");
		expect(history.points[2].accuracyMeters).toBe(10);
	});

	it("keeps frequent places for suggestions", () => {
		expect(history.frequentPlaces).toEqual([
			{ lat: 52.0907, lng: 5.1214, label: "HOME", placeId: "home-place" },
		]);
	});
});

describe("iOS export", () => {
	const ios = [
		{
			startTime: "2026-05-06T08:10:00.000+02:00",
			endTime: "2026-05-06T16:40:00.000+02:00",
			visit: {
				hierarchyLevel: "0",
				probability: "0.91",
				topCandidate: {
					placeID: "work-ios",
					semanticType: "Work",
					placeLocation: "geo:52.356700,4.873600",
				},
			},
		},
		{
			startTime: "2026-05-06T00:00:00.000+02:00",
			endTime: "2026-05-06T02:00:00.000+02:00",
			timelinePath: [
				{
					point: "geo:52.090700,5.121400",
					durationMinutesOffsetFromStartTime: "0",
				},
				{
					point: "geo:52.090700,5.121400",
					durationMinutesOffsetFromStartTime: "109",
				},
			],
		},
	];

	it("parses the bare-array variant with geo URIs", () => {
		const history = parse(ios, "location-history.json");
		expect(history.visits).toHaveLength(1);
		expect(history.visits[0].lat).toBeCloseTo(52.3567);
		expect(history.visits[0].semanticType).toBe("WORK");
		expect(history.visits[0].placeId).toBe("work-ios");
		expect(history.points).toHaveLength(2);
		expect(formatClock(history.points[1].wall)).toBe("01:49");
	});
});

describe("legacy Takeout", () => {
	const legacy = {
		timelineObjects: [
			{
				placeVisit: {
					location: {
						latitudeE7: 520907000,
						longitudeE7: 51214000,
						placeId: "legacy-home",
					},
					duration: {
						startTimestamp: "2026-05-07T20:00:00.000Z",
						endTimestamp: "2026-05-08T06:00:00.000Z",
					},
				},
			},
		],
	};

	it("parses placeVisit with E7 coordinates", () => {
		const history = parse(legacy, "2026_MAY.json");
		expect(history.files[0].format).toBe("legacy");
		expect(history.visits).toHaveLength(1);
		expect(history.visits[0].lat).toBeCloseTo(52.0907);
		expect(history.visits[0].durationMs).toBe(10 * 3_600_000);
	});
});

describe("Records.json", () => {
	it("parses raw location points", () => {
		const history = parse(
			{
				locations: [
					{
						latitudeE7: 520907000,
						longitudeE7: 51214000,
						accuracy: 20,
						timestampMs: "1778000000000",
					},
				],
			},
			"Records.json",
		);
		expect(history.points).toHaveLength(1);
		expect(history.files[0].format).toBe("records");
	});
});

describe("robustness", () => {
	it("deduplicates identical visits from overlapping exports", () => {
		const text = JSON.stringify(android);
		const history = parseTimelineJson([
			{ name: "android.json", bytes: text.length, text },
			{ name: "android-copy.json", bytes: text.length, text },
		]);
		expect(history.visits).toHaveLength(3);
		expect(history.points).toHaveLength(3);
	});

	it("reports invalid JSON without throwing", () => {
		const history = parse("{ nope");
		expect(history.warnings[0]).toContain("could not be read as JSON");
		expect(history.files[0].error).toBeTruthy();
	});

	it("reports unknown formats", () => {
		const history = parse({ something: [] });
		expect(history.warnings[0]).toContain("not a Google Timeline export");
	});

	it("skips segments without coordinates but keeps going", () => {
		const history = parse({
			semanticSegments: [
				{
					startTime: "2026-05-04T09:00:00Z",
					endTime: "2026-05-04T10:00:00Z",
					visit: { topCandidate: { semanticType: "UNKNOWN" } },
				},
				android.semanticSegments[1],
			],
		});
		expect(history.visits).toHaveLength(1);
	});

	it("ignores activities, so driving past the office is not presence", () => {
		const history = parse({
			semanticSegments: [
				{
					startTime: "2026-05-04T09:00:00Z",
					endTime: "2026-05-04T09:30:00Z",
					activity: {
						start: { latLng: "52.0907°, 5.1214°" },
						end: { latLng: "52.3567°, 4.8736°" },
						distanceMeters: 34000,
						topCandidate: { type: "IN_PASSENGER_VEHICLE" },
					},
				},
			],
		});
		expect(history.visits).toHaveLength(0);
		expect(history.points).toHaveLength(0);
	});
});
