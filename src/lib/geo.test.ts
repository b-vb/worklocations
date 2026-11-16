import { describe, expect, it } from "vitest";
import {
	formatLatLng,
	haversineMeters,
	parseCoordinateInput,
	parseLatLng,
} from "./geo";

describe("parseLatLng", () => {
	it("reads Android degree strings", () => {
		expect(parseLatLng("52.0907°, 5.1214°")).toEqual({
			lat: 52.0907,
			lng: 5.1214,
		});
	});

	it("reads iOS geo URIs with altitude", () => {
		expect(parseLatLng("geo:52.0907,5.1214,12.5")).toEqual({
			lat: 52.0907,
			lng: 5.1214,
		});
	});

	it("reads nested { latLng } objects", () => {
		expect(parseLatLng({ latLng: "52.0907°, 5.1214°" })).toEqual({
			lat: 52.0907,
			lng: 5.1214,
		});
	});

	it("reads legacy E7 integers", () => {
		expect(
			parseLatLng({ latitudeE7: 520907000, longitudeE7: 51214000 }),
		).toEqual({
			lat: 52.0907,
			lng: 5.1214,
		});
	});

	it("rejects nonsense", () => {
		expect(parseLatLng("not a coordinate")).toBeNull();
		expect(parseLatLng("95°, 5°")).toBeNull();
		expect(parseLatLng({ latLng: "geo:,5.1" })).toBeNull();
	});
});

describe("parseCoordinateInput", () => {
	it("reads a Google Maps place URL", () => {
		expect(
			parseCoordinateInput("https://www.google.com/maps/@52.3567,4.8736,15z"),
		).toEqual({ lat: 52.3567, lng: 4.8736 });
	});

	it("reads the !3d!4d form", () => {
		expect(
			parseCoordinateInput(
				"https://www.google.com/maps/place/X/data=!3d52.3567!4d4.8736",
			),
		).toEqual({ lat: 52.3567, lng: 4.8736 });
	});

	it("reads plain coordinates", () => {
		expect(parseCoordinateInput("52.3567, 4.8736")).toEqual({
			lat: 52.3567,
			lng: 4.8736,
		});
	});

	it("returns null for an address", () => {
		expect(parseCoordinateInput("Barbara Strozzilaan 201")).toBeNull();
	});
});

describe("haversineMeters", () => {
	it("measures the distance between Utrecht and Amsterdam", () => {
		const distance = haversineMeters(
			{ lat: 52.0907, lng: 5.1214 },
			{ lat: 52.3567, lng: 4.8736 },
		);
		expect(Math.round(distance / 1000)).toBe(34);
	});

	it("is zero for the same point", () => {
		expect(haversineMeters({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
	});
});

describe("formatLatLng", () => {
	it("formats with five decimals by default", () => {
		expect(formatLatLng({ lat: 52.0907, lng: 5.1214 })).toBe(
			"52.09070, 5.12140",
		);
	});
});
