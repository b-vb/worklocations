import { formatDate } from "./time";
import type { DayRow, DayStatus } from "./timeline/days";

export type CsvLabels = "nl" | "en";

export type CsvOptions = {
	delimiter: "," | ";";
	dateStyle: "iso" | "dmy";
	labels: CsvLabels;
	includeDay: boolean;
	includeMinutes: boolean;
	includeTimes: boolean;
	includeSource: boolean;
	includeNotes: boolean;
	onlyClassified: boolean;
	bom: boolean;
};

export const defaultCsvOptions: CsvOptions = {
	delimiter: ";",
	dateStyle: "iso",
	labels: "nl",
	includeDay: true,
	includeMinutes: true,
	includeTimes: false,
	includeSource: false,
	includeNotes: true,
	onlyClassified: true,
	bom: true,
};

const STATUS_LABELS: Record<CsvLabels, Record<DayStatus, string>> = {
	nl: {
		office: "Kantoor",
		home: "Thuis",
		other: "Anders",
		"no-data": "Onbekend",
	},
	en: { office: "Office", home: "Home", other: "Other", "no-data": "Unknown" },
};

const WEEKDAYS: Record<CsvLabels, string[]> = {
	nl: [
		"zondag",
		"maandag",
		"dinsdag",
		"woensdag",
		"donderdag",
		"vrijdag",
		"zaterdag",
	],
	en: [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	],
};

const HEADERS = {
	nl: {
		date: "Datum",
		day: "Dag",
		status: "Locatie",
		officeMinutes: "Minuten kantoor",
		homeMinutes: "Minuten thuis",
		first: "Vanaf",
		last: "Tot",
		source: "Bron",
		note: "Opmerking",
	},
	en: {
		date: "Date",
		day: "Day",
		status: "Location",
		officeMinutes: "Minutes office",
		homeMinutes: "Minutes home",
		first: "From",
		last: "To",
		source: "Source",
		note: "Note",
	},
};

function escapeCell(value: string, delimiter: string): string {
	if (
		value.includes(delimiter) ||
		value.includes('"') ||
		/[\r\n]/.test(value)
	) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
}

function noteFor(row: DayRow, labels: CsvLabels): string {
	const notes: string[] = [];
	if (row.holiday && row.override === undefined) notes.push(row.holiday);
	if (row.override !== undefined && row.override !== "skip")
		notes.push(labels === "nl" ? "handmatig" : "manual");
	if (row.override === "skip")
		notes.push(labels === "nl" ? "overgeslagen" : "skipped");
	if (row.finalStatus === "other" && row.override === undefined) {
		notes.push(labels === "nl" ? "controleren" : "check");
	}
	return notes.join(", ");
}

function sourceFor(row: DayRow, labels: CsvLabels): string {
	if (row.evidence === "visit") return labels === "nl" ? "bezoeken" : "visits";
	if (row.evidence === "positions")
		return labels === "nl" ? "locaties" : "positions";
	return labels === "nl" ? "geen data" : "no data";
}

function formatMinutes(minutes: number): string {
	return String(Math.round(minutes));
}

export function rowsToCsv(rows: DayRow[], options: CsvOptions): string {
	const headers = HEADERS[options.labels];
	const statusLabels = STATUS_LABELS[options.labels];
	const weekdays = WEEKDAYS[options.labels];

	const columns: Array<{ header: string; value: (row: DayRow) => string }> = [
		{
			header: headers.date,
			value: (row) => formatDate(row.date, options.dateStyle),
		},
		...(options.includeDay
			? [{ header: headers.day, value: (row: DayRow) => weekdays[row.weekday] }]
			: []),
		{ header: headers.status, value: (row) => statusLabels[row.finalStatus] },
		...(options.includeMinutes
			? [
					{
						header: headers.officeMinutes,
						value: (row: DayRow) => formatMinutes(row.officeMinutes),
					},
					{
						header: headers.homeMinutes,
						value: (row: DayRow) => formatMinutes(row.homeMinutes),
					},
				]
			: []),
		...(options.includeTimes
			? [
					{
						header: headers.first,
						value: (row: DayRow) => clockCell(row.firstWall),
					},
					{
						header: headers.last,
						value: (row: DayRow) => clockCell(row.lastWall),
					},
				]
			: []),
		...(options.includeSource
			? [
					{
						header: headers.source,
						value: (row: DayRow) => sourceFor(row, options.labels),
					},
				]
			: []),
		...(options.includeNotes
			? [
					{
						header: headers.note,
						value: (row: DayRow) => noteFor(row, options.labels),
					},
				]
			: []),
	];

	const lines = [
		columns.map((column) => column.header).join(options.delimiter),
	];
	const exportRows = rows.filter(
		(row) =>
			row.included &&
			(!options.onlyClassified ||
				(row.finalStatus !== "no-data" && row.finalStatus !== "other")),
	);

	for (const row of exportRows) {
		lines.push(
			columns
				.map((column) => escapeCell(column.value(row), options.delimiter))
				.join(options.delimiter),
		);
	}

	const body = lines.join("\r\n");
	return options.bom ? `\uFEFF${body}\r\n` : `${body}\r\n`;
}

function clockCell(wall: number | null): string {
	if (wall === null) return "";
	const date = new Date(wall);
	const hours = String(date.getUTCHours()).padStart(2, "0");
	const minutes = String(date.getUTCMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
}

export function csvFileName(from: string, to: string): string {
	return `afas-locaties_${from}_${to}.csv`;
}

export function exportRowsCount(rows: DayRow[], options: CsvOptions): number {
	return rows.filter(
		(row) =>
			row.included &&
			(!options.onlyClassified ||
				(row.finalStatus !== "no-data" && row.finalStatus !== "other")),
	).length;
}
