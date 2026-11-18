// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { Home } from "../HomePage";
import { i18n } from "../lib/i18n";
import { defaultSettings, saveSettings } from "../lib/settings";

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
	userLocationProfile: {
		frequentPlaces: [
			{
				placeId: "work",
				placeLocation: "52.3567°, 4.8736°",
				label: "WORK",
			},
		],
	},
};

beforeEach(async () => {
	localStorage.clear();
	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () => new Response(JSON.stringify({ files: [] }), { status: 200 }),
		),
	);
	await i18n.changeLanguage("nl");
});

it("renders the intro and boots through the import actor", async () => {
	const { container } = render(<Home />);
	expect(screen.getByText("Drie stappen, klaar")).toBeTruthy();
	expect(screen.getByText("Open je Google Tijdlijn-export")).toBeTruthy();

	const input = container.querySelector(
		'input[type="file"]',
	) as HTMLInputElement | null;
	expect(input).not.toBeNull();
	const file = new File([JSON.stringify(timeline)], "Timeline.json", {
		type: "application/json",
	});
	fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

	await waitFor(
		() => {
			expect(screen.getByText("Werk en thuis")).toBeTruthy();
		},
		{ timeout: 4000 },
	);
	expect(
		screen.getByText(
			"Stel een kantoor in om de periode, dagtabel en export te gebruiken.",
		),
	).toBeTruthy();

	fireEvent.click(screen.getByText("Gebruik werklocatie"));

	await waitFor(
		() => {
			expect(screen.getByText("Welke maanden?")).toBeTruthy();
		},
		{ timeout: 4000 },
	);
	expect(screen.getByText("Controleer de dagen")).toBeTruthy();
});

it("skips the place picker when an office is already saved", async () => {
	saveSettings({
		...defaultSettings,
		office: { lat: 52.3567, lng: 4.8736, radiusMeters: 150 },
	});
	const { container } = render(<Home />);
	const input = container.querySelector(
		'input[type="file"]',
	) as HTMLInputElement | null;
	fireEvent.change(input as HTMLInputElement, {
		target: {
			files: [new File([JSON.stringify(timeline)], "Timeline.json")],
		},
	});

	await waitFor(
		() => {
			expect(screen.getByText("Welke maanden?")).toBeTruthy();
		},
		{ timeout: 4000 },
	);
	expect(screen.queryByText("Gebruik werklocatie")).toBeNull();
});
