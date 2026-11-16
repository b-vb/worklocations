import { holidayLabel } from "./holidays";
import { formatDate, localDayKey } from "./time";
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
	includeDay: false,
	includeMinutes: false,
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
	if (row.holiday && row.override === undefined) {
		notes.push(holidayLabel(row.holiday, labels));
	}
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

export type CsvColumnKey =
	| "date"
	| "day"
	| "status"
	| "officeMinutes"
	| "homeMinutes"
	| "first"
	| "last"
	| "source"
	| "note";

export type CsvColumn = { key: CsvColumnKey; header: string };

export type CsvTable = {
	columns: CsvColumn[];
	/** Cell values in the same order as `columns`. */
	rows: string[][];
};

type ColumnWriter = CsvColumn & { value: (row: DayRow) => string };

function columnWriters(options: CsvOptions): ColumnWriter[] {
	const headers = HEADERS[options.labels];
	const statusLabels = STATUS_LABELS[options.labels];
	const weekdays = WEEKDAYS[options.labels];

	return [
		{
			key: "date",
			header: headers.date,
			value: (row) => formatDate(row.date, options.dateStyle),
		},
		...(options.includeDay
			? [
					{
						key: "day" as const,
						header: headers.day,
						value: (row: DayRow) => weekdays[row.weekday],
					},
				]
			: []),
		{
			key: "status",
			header: headers.status,
			value: (row) => statusLabels[row.finalStatus],
		},
		...(options.includeMinutes
			? [
					{
						key: "officeMinutes" as const,
						header: headers.officeMinutes,
						value: (row: DayRow) => formatMinutes(row.officeMinutes),
					},
					{
						key: "homeMinutes" as const,
						header: headers.homeMinutes,
						value: (row: DayRow) => formatMinutes(row.homeMinutes),
					},
				]
			: []),
		...(options.includeTimes
			? [
					{
						key: "first" as const,
						header: headers.first,
						value: (row: DayRow) => clockCell(row.firstWall),
					},
					{
						key: "last" as const,
						header: headers.last,
						value: (row: DayRow) => clockCell(row.lastWall),
					},
				]
			: []),
		...(options.includeSource
			? [
					{
						key: "source" as const,
						header: headers.source,
						value: (row: DayRow) => sourceFor(row, options.labels),
					},
				]
			: []),
		...(options.includeNotes
			? [
					{
						key: "note" as const,
						header: headers.note,
						value: (row: DayRow) => noteFor(row, options.labels),
					},
				]
			: []),
	];
}

export function csvRows(rows: DayRow[], options: CsvOptions): DayRow[] {
	return rows.filter(
		(row) =>
			row.included &&
			(!options.onlyClassified ||
				(row.finalStatus !== "no-data" && row.finalStatus !== "other")),
	);
}

/**
 * The same rows and columns the CSV gets, but as plain values. The UI renders
 * this as a table, which keeps the preview honest.
 */
export function buildCsvTable(rows: DayRow[], options: CsvOptions): CsvTable {
	const writers = columnWriters(options);
	return {
		columns: writers.map(({ key, header }) => ({ key, header })),
		rows: csvRows(rows, options).map((row) =>
			writers.map((writer) => writer.value(row)),
		),
	};
}

export function rowsToCsv(rows: DayRow[], options: CsvOptions): string {
	const writers = columnWriters(options);
	const lines = [
		writers.map((column) => column.header).join(options.delimiter),
	];

	for (const row of csvRows(rows, options)) {
		lines.push(
			writers
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

export function csvFileName(): string {
	return `werkplekken-${localDayKey()}.csv`;
}

export function exportRowsCount(rows: DayRow[], options: CsvOptions): number {
	return csvRows(rows, options).length;
}
