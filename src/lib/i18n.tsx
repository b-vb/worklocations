import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { useMemo } from "react";
import { initReactI18next, useTranslation } from "react-i18next";
import { holidayLabel } from "./holidays";

export type Locale = "nl" | "en";

const LOCALE_STORAGE_KEY = "worklocations.locale.v1";
const LEGACY_LOCALE_STORAGE_KEY = "afas-commute-log.locale.v1";

try {
	if (
		typeof localStorage !== "undefined" &&
		!localStorage.getItem(LOCALE_STORAGE_KEY)
	) {
		const legacy = localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
		if (legacy === "nl" || legacy === "en") {
			localStorage.setItem(LOCALE_STORAGE_KEY, legacy);
		}
	}
} catch {
	// Storage may be unavailable; detection still works without it.
}

const nl = {
	"app.title": "Waar heb ik gewerkt?",
	"app.noUploads": "geen uploads",
	"app.closeData": "Sluit bestand",
	"app.language": "Taal",

	"result.title": "Jouw dagen",
	"intro.title": "Drie stappen, klaar",
	"intro.subtitle":
		"Drie stappen. Je locatiegeschiedenis blijft in je browser.",
	"intro.step1.title": "1. Open je export",
	"intro.step1.body":
		"Kies het Timeline.json van je telefoon. Het bestand wordt lokaal in een worker gelezen, dus ook een bestand van 200 MB bevriest de pagina niet.",
	"intro.step2.title": "2. Kies werk en thuis",
	"intro.step2.body":
		"Kies de suggestie of open de kaart. Alles binnen de straal telt als tijd op die plek.",
	"intro.step3.title": "3. Controleer en exporteer",
	"intro.step3.body":
		"Kies de periode, pas losse dagen aan en download een CSV met Datum + Kantoor/Thuis.",

	"drop.titleFirst": "Open je Google Tijdlijn-export",
	"drop.titleAgain": "Locatiegeschiedenis",
	"drop.descriptionFirst":
		"Het bestand wordt alleen in je browser gelezen. Niets wordt geüpload; je locatiegegevens verlaten dit apparaat nooit.",
	"drop.descriptionAgain":
		"Sleep een nieuwe export hierheen om het huidige bestand te vervangen — meerdere bestanden tegelijk worden samengevoegd.",
	"drop.local": "100% lokaal",
	"drop.drop": "Sleep Timeline.json hierheen, of klik om te kiezen",
	"drop.reading": "Bezig met lezen…",
	"drop.readingFile": "Bezig met lezen: {{name}} ({{index}}/{{total}})…",
	"drop.building": "Dagoverzicht maken…",
	"drop.readFailed": "Kon het bestand niet lezen.",
	"drop.formats": "Android Timeline.json of iPhone location-history.json.",
	"drop.where": "Waar vind ik het bestand?",
	"drop.android": "Android (Google Maps-app)",
	"drop.androidHelp":
		"Tik op je profielfoto → Instellingen → Locatie en privacy → Tijdlijn exporteren. Hernoem het bestand naar Timeline.json als de extensie ontbreekt.",
	"drop.ios": "iPhone (Google Maps-app)",
	"drop.iosHelp":
		"Profielfoto → Instellingen → Locatie en privacy → Tijdlijn exporteren. Het bestand heet location-history.json.",
	"loaded.title": "Jouw export",
	"loaded.description":
		"Al geladen in deze browser. Vervang het bestand als je een nieuwere export hebt.",
	"loaded.details": "Details",
	"loaded.hideDetails": "Verberg details",
	"loaded.replace": "Vervang bestand",
	"loaded.done": "Klaar",
	"loaded.file_one": "{{count, number}} bestand",
	"loaded.file_other": "{{count, number}} bestanden",
	"loaded.visit_one": "{{count, number}} bezoek",
	"loaded.visit_other": "{{count, number}} bezoeken",
	"loaded.point_one": "{{count, number}} punt",
	"loaded.point_other": "{{count, number}} punten",
	"loaded.available": "{{from}} – {{to}} beschikbaar",
	"loaded.warning_one": "{{count, number}} waarschuwing",
	"loaded.warning_other": "{{count, number}} waarschuwingen",
	"loaded.filesHeading": "Bestanden",
	"loaded.warningsHeading": "Waarschuwingen",
	"format.device": "telefoon",

	"places.title": "Werk en thuis",
	"places.description":
		"Kies een suggestie, of open de kaart om de exacte plek te kiezen.",
	"places.editOnMap": "Bewerk op kaart",
	"places.office": "Kantoor",
	"places.home": "Thuis",
	"places.set": "ingesteld",
	"places.needed": "nodig",
	"places.auto": "auto",
	"places.pinned": "Op de kaart gekozen",
	"places.radius": "{{radius, number}} m straal",
	"places.change": "Wijzig",
	"places.officeHint": "Alles binnen deze straal telt als een dag op kantoor.",
	"places.useWork": "Gebruik Google's WORK-plek",
	"places.pickOnMap": "Kies op kaart",
	"places.homeHint":
		"We gebruiken de plek die Google HOME noemt. Zet hem vast voor scherpere resultaten.",
	"places.useHome": "Gebruik voorgestelde thuis",
	"places.footerSaved":
		"Deze instellingen worden in deze browser bewaard, dus je hoeft dit maar één keer te doen.",
	"places.footerNeeded":
		"Stel een kantoor in om de periode, dagtabel en export te gebruiken.",
	"places.next": "Volgende: kies de periode",
	"places.workFromGoogle": "Werk (van Google)",
	"places.homeFromGoogle": "Thuis (van Google)",

	"places.editorTitle": "Waar is het kantoor?",
	"places.editorDescription":
		"Klik op de kaart of sleep de spelden. Elke minuut binnen een straal telt als tijd op die plek.",
	"places.done": "Klaar",
	"places.workFound": "Google WORK-plek gevonden",
	"places.addressLabel": "Kantooradres, coördinaten of Google Maps-link",
	"places.addressPlaceholder": "bijv. Barbara Strozzilaan 201, Amsterdam",
	"places.useMostVisited": "Gebruik meest bezochte plek",
	"places.geoFailed": "Kon je locatie niet ophalen.",
	"places.work": "Werk",
	"places.addressHint":
		"Adressen worden opgezocht via OpenStreetMap Photon. Verder verlaat niets je browser.",
	"places.useCoords": "Gebruik coördinaten {{coords}}",
	"places.searching": "Zoeken…",
	"places.noAddress": "Geen adres gevonden. Probeer straat en plaats.",
	"places.searchFailed": "Adres zoeken mislukt.",
	"places.useCurrent": "Gebruik mijn huidige locatie",
	"places.locating": "Locatie ophalen…",
	"places.clearOffice": "Wis kantoor",
	"places.autoHome": "Auto",
	"places.officeBadge": "kantoor",
	"places.homeBadge": "thuis",
	"places.currentLocation": "Huidige locatie",
	"places.mostVisited": "Meest bezochte plek",
	"places.homeAuto": "Thuis — automatisch",
	"places.homeAutoHint":
		"We gebruiken Google's HOME-label. Zet je huis vast voor scherpere resultaten.",
	"places.useSuggested": "Gebruik suggestie",
	"places.frequent": "Plekken waar je vaak bent",
	"places.frequentHint":
		"Gebaseerd op je eigen geschiedenis. Eén klik om vast te zetten.",
	"places.frequentPlace": "Veelbezochte plek",
	"places.frequentSummary":
		"{{hours, number}}u totaal · {{days, number}} dagen",
	"places.noPlaces": "Nog geen plekken gevonden.",
	"places.radiusLabel": "Straal",
	"places.back": "Terug naar suggesties",

	"map.clickToSet": "Klik op de kaart voor",
	"map.office": "Kantoor",
	"map.home": "Thuis",
	"map.recenter": "Hercentreer",
	"map.dragHint": "Sleep een speld om bij te stellen",
	"map.tilesFailed":
		"Kaarttegels konden niet laden (offline?). Klikken en slepen werkt nog steeds.",

	"period.title": "Welke maanden?",
	"period.description":
		"Kies de maanden die je nodig hebt. Je kunt altijd in stukken exporteren.",
	"period.from": "Van",
	"period.to": "Tot",
	"period.options": "Opties",
	"period.preset2m": "Laatste 2 maanden",
	"period.preset6m": "Laatste 6 maanden",
	"period.preset12m": "Laatste 12 maanden",
	"period.presetYear": "Dit jaar",
	"period.presetAll": "Alles",
	"period.workingDays": "Werkdagen",
	"period.holidays": "Sla Nederlandse feestdagen over",
	"period.holidaysHint":
		"Pasen, Koningsdag, Kerst enzovoort. Elke dag kun je later handmatig aanpassen.",
	"period.window": "Werktijden",
	"period.windowHint":
		"Alleen tijd binnen dit venster bepaalt of een dag kantoor, thuis of anders is. Slapen en avonden tellen niet mee.",
	"period.windowStartAria": "Begintijd werktijden",
	"period.windowEndAria": "Eindtijd werktijden",
	"period.hours": "uur",
	"period.minOffice": "Minimale tijd op kantoor",
	"period.minOfficeHint":
		"Dagen met minder kantoortijd worden thuis (of om te controleren).",
	"period.minutes": "minuten",
	"period.minOfficeExplainer":
		"Een normale kantoordag loopt van aankomst tot vertrek; 2 uur is een veilige grens.",
	"period.officeAtLeast": "kantoor ≥ {{min}}",
	"period.holidaysSkipped": "feestdagen overgeslagen",
	"period.holidaysIncluded": "feestdagen inbegrepen",
	"period.everyDay": "elke dag",
	"period.noWorkdays": "geen werkdagen",
	"period.monFri": "ma–vr",
	"period.next": "Volgende: bekijk de dagen",
	"period.nextHint":
		"De periode aanpassen werkt de dagtabel hieronder direct bij.",

	"summary.days": "Werkdagen",
	"summary.daysHint": "in de geselecteerde periode",
	"summary.office": "Kantoor",
	"summary.home": "Thuis",
	"summary.review": "Te controleren",
	"summary.reviewHint": "andere plekken of geen data",
	"summary.pto": "Verlof",
	"summary.percent": "{{percent, number}}% van de dagen",
	"summary.override_one": "{{count, number}} handmatige aanpassing",
	"summary.override_other": "{{count, number}} handmatige aanpassingen",

	"days.title": "Controleer de dagen",
	"days.toReviewTitle": "Dagen om te controleren",
	"days.description":
		"Alles is ingevuld. Pas een dag aan waar nodig; wijzigingen worden in deze browser bewaard.",
	"days.toReview_one":
		"{{count, number}} dag vraagt een keuze. Stel de locatie in of sla de dag over.",
	"days.toReview_other":
		"{{count, number}} dagen vragen een keuze. Stel de locatie in of sla de dag over.",
	"days.resetOverride_one": "Reset {{count, number}} aanpassing",
	"days.resetOverride_other": "Reset {{count, number}} aanpassingen",
	"days.filterReview": "Te controleren ({{count, number}})",
	"days.filterWorkdays": "Werkdagen ({{count, number}})",
	"days.filterAll": "Alle dagen ({{count, number}})",
	"days.date": "Datum",
	"days.timeline": "Tijdlijn",
	"days.office": "Kantoor",
	"days.home": "Thuis",
	"days.location": "Locatie",
	"days.nothing": "Niets te tonen voor dit filter.",
	"days.legendOffice": "kantoor",
	"days.legendHome": "thuis",
	"days.legendOther": "andere plek",
	"days.hiddenHint":
		'Verborgen dagen (weekend, feestdag, overgeslagen) staan onder "Alle dagen".',
	"days.positions": "uit posities",
	"days.selectAria": "Locatie voor {{date}}",
	"days.auto": "Auto · {{status}}",
	"days.optionOffice": "Kantoor",
	"days.optionHome": "Thuis",
	"days.optionOther": "Anders",
	"days.optionPto": "Verlof",
	"days.optionSkip": "Overslaan",
	"status.office": "Kantoor",
	"status.home": "Thuis",
	"status.other": "Anders",
	"status.pto": "Verlof",
	"status.no-data": "Geen data",

	"export.title": "Maak je CSV",
	"export.description":
		"Controleer de tabel en download. Het bestand opent in Excel.",
	"export.row_one": "{{count, number}} rij",
	"export.row_other": "{{count, number}} rijen",
	"export.options": "Opties",
	"export.delimiter": "Scheidingsteken",
	"export.semicolon": "Puntkomma ;",
	"export.comma": "Komma ,",
	"export.dateFormat": "Datumnotatie",
	"export.locationLabels": "Locatielabels",
	"export.onlyClassified": "Alleen kantoor/thuis",
	"export.onlyClassifiedHint": "Laat dagen met Anders of Geen data weg.",
	"export.bom": "UTF-8 BOM",
	"export.bomHint": "Houdt accenten goed in Excel.",
	"export.extraColumns": "Extra kolommen",
	"export.weekday": "Dag",
	"export.minutes": "Minuten",
	"export.firstLast": "Eerste/laatste",
	"export.evidence": "Bron",
	"export.notes": "Opmerkingen",
	"export.review_one": "{{count, number}} dag vraagt nog een keuze.",
	"export.review_other": "{{count, number}} dagen vragen nog een keuze.",
	"export.reviewExcluded": "Ze staan niet in dit bestand.",
	"export.reviewIncluded": "Ze worden als Anders/Onbekend geëxporteerd.",
	"export.preview": "Voorbeeld",
	"export.previewHint": "Precies wat HR krijgt — één rij per werkdag.",
	"export.leftOut_one": "{{count, number}} dag weggelaten door het filter.",
	"export.leftOut_other": "{{count, number}} dagen weggelaten door het filter.",
	"export.table": "Tabel",
	"export.csvText": "CSV-tekst",
	"export.download": "Download CSV",
	"export.fileNote_one":
		"{{file}} · {{count, number}} datarij, niets geüpload.",
	"export.fileNote_other":
		"{{file}} · {{count, number}} datarijen, niets geüpload.",
	"export.noRowsTitle": "Nog geen rijen",
	"export.noRowsHint":
		'Zet je kantoor in stap 2, verbreed de periode in stap 3, of zet "Alleen kantoor/thuis" uit om alles te zien.',
	"export.summarySemicolon": "puntkomma",
	"export.summaryComma": "komma",
	"export.summaryIso": "ISO-datums",
	"export.summaryDmy": "DD-MM-JJJJ",
	"export.summaryOnly": "alleen geclassificeerde dagen",
	"export.summaryAll": "alle dagen",
	"export.emptyCell": "—",

	"footer.privacy":
		"Je locatiegeschiedenis blijft in je browser. Instellingen en handmatige aanpassingen worden in deze browser bewaard.",
	"footer.reset": "Wis opgeslagen instellingen",
	"footer.resetConfirm":
		"Je opgeslagen kantoor, thuis, werktijden, exportopties en handmatige aanpassingen wissen? Het geladen bestand blijft geladen.",

	"local.title": "Gevonden in ./data",
	"local.loading": "Laden…",
	"local.failed": "Kon {{name}} niet lezen ({{status}}).",
	"local.readFailed": "Kon het bestand niet lezen.",
};

type Translation = typeof nl;

const en: Translation = {
	"app.title": "Where did I work?",
	"app.noUploads": "no uploads",
	"app.closeData": "Close data",
	"app.language": "Language",

	"result.title": "Your days",
	"intro.title": "Three steps, done",
	"intro.subtitle": "No spreadsheet fuss. Your timeline stays in your browser.",
	"intro.step1.title": "1. Open the export",
	"intro.step1.body":
		"Pick the Timeline.json from your phone. It is parsed locally in a worker, so even a 200 MB file will not freeze the page.",
	"intro.step2.title": "2. Pick work and home",
	"intro.step2.body":
		"Take the suggestion or open the map. Everything inside the radius counts as time at that place.",
	"intro.step3.title": "3. Review and export",
	"intro.step3.body":
		"Pick the period, fix the odd day, then download a CSV with Date + Office/Home.",

	"drop.titleFirst": "Open your Google Timeline export",
	"drop.titleAgain": "Location history",
	"drop.descriptionFirst":
		"The file is read in your browser only. Nothing is uploaded, and no location data ever leaves this device.",
	"drop.descriptionAgain":
		"Drop another export to replace what is loaded — select several files at once to merge them.",
	"drop.local": "100% local",
	"drop.drop": "Drop Timeline.json here, or click to choose",
	"drop.reading": "Reading…",
	"drop.readingFile": "Reading {{name}} ({{index}}/{{total}})…",
	"drop.building": "Building your day-by-day timeline…",
	"drop.readFailed": "Could not read the file.",
	"drop.formats": "Android Timeline.json or iPhone location-history.json.",
	"drop.where": "Where do I get the file?",
	"drop.android": "Android (Google Maps app)",
	"drop.androidHelp":
		"Profile picture → Settings → Location & Privacy → Export Timeline data. Rename the file to Timeline.json if the extension is missing.",
	"drop.ios": "iPhone (Google Maps app)",
	"drop.iosHelp":
		"Profile picture → Settings → Location & Privacy → Export Timeline data. The file is called location-history.json.",
	"loaded.title": "Your export",
	"loaded.description":
		"Already loaded in this browser. Replace it if you have a newer export.",
	"loaded.details": "Details",
	"loaded.hideDetails": "Hide details",
	"loaded.replace": "Replace file",
	"loaded.done": "Done",
	"loaded.file_one": "{{count, number}} file",
	"loaded.file_other": "{{count, number}} files",
	"loaded.visit_one": "{{count, number}} visit",
	"loaded.visit_other": "{{count, number}} visits",
	"loaded.point_one": "{{count, number}} point",
	"loaded.point_other": "{{count, number}} points",
	"loaded.available": "{{from}} – {{to}} available",
	"loaded.warning_one": "{{count, number}} warning",
	"loaded.warning_other": "{{count, number}} warnings",
	"loaded.filesHeading": "Files",
	"loaded.warningsHeading": "Warnings",
	"format.device": "phone",

	"places.title": "Work and home",
	"places.description":
		"Pick a suggestion, or open the map to choose the exact spot.",
	"places.editOnMap": "Edit on map",
	"places.office": "Office",
	"places.home": "Home",
	"places.set": "set",
	"places.needed": "needed",
	"places.auto": "auto",
	"places.pinned": "Pinned on the map",
	"places.radius": "{{radius, number}} m radius",
	"places.change": "Change",
	"places.officeHint":
		"Everything inside this radius counts as a day at the office.",
	"places.useWork": "Use Google's WORK place",
	"places.pickOnMap": "Pick on map",
	"places.homeHint":
		"Using the place Google labels HOME. Pin it for sharper results.",
	"places.useHome": "Use suggested home",
	"places.footerSaved":
		"These settings are saved in this browser, so you only have to do this once.",
	"places.footerNeeded":
		"Set an office to unlock the period, the day table and the export.",
	"places.next": "Next: choose the period",
	"places.workFromGoogle": "Work (from Google)",
	"places.homeFromGoogle": "Home (from Google)",

	"places.editorTitle": "Where is the office?",
	"places.editorDescription":
		"Click the map or drag the pins. Every minute inside a radius counts as time at that place.",
	"places.done": "Done",
	"places.workFound": "Google labelled WORK found",
	"places.addressLabel": "Office address, coordinates, or Google Maps link",
	"places.addressPlaceholder": "e.g. Barbara Strozzilaan 201, Amsterdam",
	"places.useMostVisited": "Use most visited place",
	"places.geoFailed": "Could not get your location.",
	"places.work": "Work",
	"places.addressHint":
		"Address lookups go to OpenStreetMap's Photon service. Nothing else leaves your browser.",
	"places.useCoords": "Use coordinates {{coords}}",
	"places.searching": "Searching…",
	"places.noAddress": "No address found. Try a street name and city.",
	"places.searchFailed": "Address lookup failed.",
	"places.useCurrent": "Use my current location",
	"places.locating": "Locating…",
	"places.clearOffice": "Clear office",
	"places.autoHome": "Auto",
	"places.officeBadge": "office",
	"places.homeBadge": "home",
	"places.currentLocation": "Current location",
	"places.mostVisited": "Most visited place",
	"places.homeAuto": "Home — auto",
	"places.homeAutoHint":
		"Using Google's HOME label. Pin it for sharper results.",
	"places.useSuggested": "Use suggested",
	"places.frequent": "Places you spend time",
	"places.frequentHint":
		"Based on your own history. One click to pin office or home.",
	"places.frequentPlace": "Frequent place",
	"places.frequentSummary": "{{hours, number}}h total · {{days, number}} days",
	"places.noPlaces": "No places found yet.",
	"places.radiusLabel": "Radius",
	"places.back": "Back to suggestions",

	"map.clickToSet": "Click the map to set",
	"map.office": "Office",
	"map.home": "Home",
	"map.recenter": "Recenter",
	"map.dragHint": "Drag a pin to fine-tune",
	"map.tilesFailed":
		"Map tiles could not be loaded (offline?). Clicking and dragging still sets the location.",

	"period.title": "Which months?",
	"period.description":
		"Pick the months you need. Export in chunks if that is easier.",
	"period.from": "From",
	"period.to": "To",
	"period.options": "Options",
	"period.preset2m": "Last 2 months",
	"period.preset6m": "Last 6 months",
	"period.preset12m": "Last 12 months",
	"period.presetYear": "This year",
	"period.presetAll": "All data",
	"period.workingDays": "Working days",
	"period.holidays": "Skip Dutch public holidays",
	"period.holidaysHint":
		"Easter, King's Day, Christmas and friends. Override any day manually in the table.",
	"period.window": "Working hours",
	"period.windowHint":
		"Only time inside this window decides whether a day is office, home, or other. Sleep and evenings are ignored.",
	"period.windowStartAria": "Working hours start",
	"period.windowEndAria": "Working hours end",
	"period.hours": "hours",
	"period.minOffice": "Minimum time at the office",
	"period.minOfficeHint":
		"Days with less office time are classified as home (or flagged for review).",
	"period.minutes": "minutes",
	"period.minOfficeExplainer":
		"A normal office day is detected from the moment you arrive until you leave, so 2 hours is a safe threshold.",
	"period.officeAtLeast": "office ≥ {{min}}",
	"period.holidaysSkipped": "holidays skipped",
	"period.holidaysIncluded": "holidays included",
	"period.everyDay": "every day",
	"period.noWorkdays": "no working days",
	"period.monFri": "Mon–Fri",
	"period.next": "Next: check the days",
	"period.nextHint":
		"Changing the period updates the day table below instantly.",

	"summary.days": "Working days",
	"summary.daysHint": "in the selected range",
	"summary.office": "Office",
	"summary.home": "Home",
	"summary.review": "To review",
	"summary.reviewHint": "other places or no data",
	"summary.pto": "PTO",
	"summary.percent": "{{percent, number}}% of days",
	"summary.override_one": "{{count, number}} manual override",
	"summary.override_other": "{{count, number}} manual overrides",

	"days.title": "Check the days",
	"days.toReviewTitle": "Days to review",
	"days.description":
		"Everything is filled in. Adjust any day if needed; changes are saved in this browser.",
	"days.toReview_one":
		"{{count, number}} day needs a decision. Set the location, or skip the day.",
	"days.toReview_other":
		"{{count, number}} days need a decision. Set the location, or skip the day.",
	"days.resetOverride_one": "Reset {{count, number}} override",
	"days.resetOverride_other": "Reset {{count, number}} overrides",
	"days.filterReview": "Needs review ({{count, number}})",
	"days.filterWorkdays": "Workdays ({{count, number}})",
	"days.filterAll": "All days ({{count, number}})",
	"days.date": "Date",
	"days.timeline": "Timeline",
	"days.office": "Office",
	"days.home": "Home",
	"days.location": "Location",
	"days.nothing": "Nothing to show for this filter.",
	"days.legendOffice": "office",
	"days.legendHome": "home",
	"days.legendOther": "other place",
	"days.hiddenHint":
		'Hidden days (weekends, holidays, skipped) are still in "All days".',
	"days.positions": "from positions",
	"days.selectAria": "Location for {{date}}",
	"days.auto": "Auto · {{status}}",
	"days.optionOffice": "Office",
	"days.optionHome": "Home",
	"days.optionOther": "Other",
	"days.optionPto": "PTO",
	"days.optionSkip": "Skip",
	"status.office": "Office",
	"status.home": "Home",
	"status.other": "Other",
	"status.pto": "PTO",
	"status.no-data": "No data",

	"export.title": "Make your CSV",
	"export.description":
		"Check the table, then download. The file opens in Excel.",
	"export.row_one": "{{count, number}} row",
	"export.row_other": "{{count, number}} rows",
	"export.options": "Options",
	"export.delimiter": "Delimiter",
	"export.semicolon": "Semicolon ;",
	"export.comma": "Comma ,",
	"export.dateFormat": "Date format",
	"export.locationLabels": "Location labels",
	"export.onlyClassified": "Only office/home rows",
	"export.onlyClassifiedHint":
		"Leave out days that still say Other or No data.",
	"export.bom": "UTF-8 BOM",
	"export.bomHint": "Keeps accents intact in Excel.",
	"export.extraColumns": "Extra columns",
	"export.weekday": "Weekday",
	"export.minutes": "Minutes",
	"export.firstLast": "First/last seen",
	"export.evidence": "Evidence",
	"export.notes": "Notes",
	"export.review_one": "{{count, number}} day still needs a decision.",
	"export.review_other": "{{count, number}} days still need a decision.",
	"export.reviewExcluded": "They are left out of this file.",
	"export.reviewIncluded": "They are exported as Other/Unknown.",
	"export.preview": "Preview",
	"export.previewHint": "Exactly what HR gets — one row per working day.",
	"export.leftOut_one": "{{count, number}} day left out by the filter.",
	"export.leftOut_other": "{{count, number}} days left out by the filter.",
	"export.table": "Table",
	"export.csvText": "CSV text",
	"export.download": "Download CSV",
	"export.fileNote_one":
		"{{file}} · {{count, number}} data row, nothing uploaded.",
	"export.fileNote_other":
		"{{file}} · {{count, number}} data rows, nothing uploaded.",
	"export.noRowsTitle": "No rows to show yet",
	"export.noRowsHint":
		'Pin your office in step 2, widen the period in step 3, or turn off "Only office/home rows" to see everything.',
	"export.summarySemicolon": "semicolon",
	"export.summaryComma": "comma",
	"export.summaryIso": "ISO dates",
	"export.summaryDmy": "DD-MM-YYYY",
	"export.summaryOnly": "only classified days",
	"export.summaryAll": "all days",
	"export.emptyCell": "—",

	"footer.privacy":
		"Your location history stays in your browser. Settings and manual changes are remembered in this browser.",
	"footer.reset": "Reset saved settings",
	"footer.resetConfirm":
		"Clear your saved office, home, working hours, export options and manual day overrides? The loaded file stays loaded.",

	"local.title": "Found in ./data",
	"local.loading": "Loading…",
	"local.failed": "Could not read {{name}} ({{status}}).",
	"local.readFailed": "Could not read the file.",
};

void i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			nl: { translation: nl },
			en: { translation: en },
		},
		fallbackLng: "nl",
		supportedLngs: ["nl", "en"],
		nonExplicitSupportedLngs: true,
		load: "languageOnly",
		initAsync: false,
		interpolation: { escapeValue: false },
		detection: {
			order: ["localStorage", "navigator"],
			lookupLocalStorage: LOCALE_STORAGE_KEY,
			caches: ["localStorage"],
			convertDetectedLanguage: (language) =>
				language.toLowerCase().startsWith("en") ? "en" : "nl",
		},
		react: { useSuspense: false },
	});

function syncDocumentLanguage(language: string) {
	if (typeof document === "undefined") return;
	document.documentElement.lang = language.startsWith("en") ? "en" : "nl";
}

syncDocumentLanguage(i18n.language);
i18n.on("languageChanged", syncDocumentLanguage);

export { i18n };

export function useI18n() {
	const { t, i18n: instance } = useTranslation();
	const locale: Locale = (
		instance.resolvedLanguage ??
		instance.language ??
		"nl"
	).startsWith("en")
		? "en"
		: "nl";

	const formatters = useMemo(() => {
		const intlLocale = locale === "nl" ? "nl-NL" : "en-GB";
		return {
			number: new Intl.NumberFormat(intlLocale),
			weekday: new Intl.DateTimeFormat(intlLocale, {
				weekday: "short",
				timeZone: "UTC",
			}),
			day: new Intl.DateTimeFormat(intlLocale, {
				day: "2-digit",
				month: "short",
				year: "numeric",
				timeZone: "UTC",
			}),
		};
	}, [locale]);

	return {
		locale,
		setLocale: (next: Locale) => {
			void instance.changeLanguage(next);
		},
		t,
		formatNumber: (value: number) => formatters.number.format(value),
		// 2024-01-07 is a Sunday, so 7 + index walks Sunday..Saturday.
		formatWeekday: (index: number) =>
			formatters.weekday.format(new Date(Date.UTC(2024, 0, 7 + index))),
		formatDay: (key: string) => {
			const [year, month, day] = key.split("-").map(Number);
			return formatters.day.format(new Date(Date.UTC(year, month - 1, day)));
		},
		holiday: (name: string) => holidayLabel(name, locale),
	};
}
