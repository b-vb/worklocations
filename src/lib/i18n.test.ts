import { afterAll, describe, expect, it } from "vitest";
import { holidayLabel } from "./holidays";
import { i18n } from "./i18n";

afterAll(async () => {
	await i18n.changeLanguage("nl");
});

describe("i18n resources", () => {
	it("ships Dutch and English", () => {
		expect(i18n.getResourceBundle("nl", "translation")["app.title"]).toBe(
			"Waar heb ik gewerkt?",
		);
		expect(i18n.getResourceBundle("en", "translation")["app.title"]).toBe(
			"Where did I work?",
		);
	});

	it("uses i18next plural rules", async () => {
		await i18n.changeLanguage("nl");
		expect(i18n.t("loaded.visit", { count: 1 })).toBe("1 bezoek");
		expect(i18n.t("loaded.visit", { count: 2 })).toBe("2 bezoeken");

		await i18n.changeLanguage("en");
		expect(i18n.t("loaded.visit", { count: 1 })).toBe("1 visit");
		expect(i18n.t("loaded.visit", { count: 2 })).toBe("2 visits");
	});

	it("formats numbers per language", async () => {
		await i18n.changeLanguage("nl");
		expect(i18n.t("loaded.point", { count: 345900 })).toBe("345.900 punten");

		await i18n.changeLanguage("en");
		expect(i18n.t("loaded.point", { count: 345900 })).toBe("345,900 points");
	});

	it("interpolates dates and labels", async () => {
		await i18n.changeLanguage("nl");
		expect(
			i18n.t("loaded.available", { from: "1 nov 2011", to: "15 nov 2026" }),
		).toBe("1 nov 2011 – 15 nov 2026 beschikbaar");
	});

	it("translates holiday names for English", () => {
		expect(holidayLabel("Koningsdag", "en")).toBe("King's Day");
		expect(holidayLabel("Koningsdag", "nl")).toBe("Koningsdag");
	});

	it("falls back to Dutch for unsupported languages", async () => {
		await i18n.changeLanguage("de");
		expect(i18n.t("app.title")).toBe("Waar heb ik gewerkt?");
	});
});
