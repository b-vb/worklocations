import { useActor } from "@xstate/react";
import { useMemo } from "react";
import {
	buildCsvTable,
	type CsvColumnKey,
	type CsvOptions,
	csvFileName,
	exportRowsCount,
	rowsToCsv,
} from "../lib/csv";
import { useI18n } from "../lib/i18n";
import type { DayRow } from "../lib/timeline/days";
import { exportPanelMachine } from "../machines/exportPanelMachine";
import { Badge, Button, Card, cn, GearIcon, SectionHeader, Toggle } from "./ui";

type Props = {
	rows: DayRow[];
	options: CsvOptions;
	onChange: (patch: Partial<CsvOptions>) => void;
};

export function ExportPanel({ rows, options, onChange }: Props) {
	const { t } = useI18n();
	const [panelSnapshot, panelSend] = useActor(exportPanelMachine);
	const view = panelSnapshot.matches("text") ? "text" : "table";
	const showOptions = panelSnapshot.context.optionsOpen;
	const table = useMemo(() => buildCsvTable(rows, options), [rows, options]);
	const csv = useMemo(() => rowsToCsv(rows, options), [rows, options]);
	const count = exportRowsCount(rows, options);
	const includedCount = rows.filter((row) => row.included).length;
	const hiddenByFilter = includedCount - count;
	const reviewCount = rows.filter(
		(row) => row.included && row.needsReview,
	).length;
	const fileName = csvFileName();

	const download = () => {
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = fileName;
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	const optionsSummary = [
		options.delimiter === ";"
			? t("export.summarySemicolon")
			: t("export.summaryComma"),
		options.dateStyle === "iso"
			? t("export.summaryIso")
			: t("export.summaryDmy"),
		options.labels === "nl" ? "Kantoor/Thuis" : "Office/Home",
		options.onlyClassified ? t("export.summaryOnly") : t("export.summaryAll"),
	].join(" · ");

	return (
		<Card>
			<SectionHeader
				step="5"
				title={t("export.title")}
				description={t("export.description")}
				action={
					<div className="flex items-center gap-2">
						<Badge tone={count > 0 ? "ok" : "warn"}>
							{t("export.row", { count })}
						</Badge>
						<Button
							size="sm"
							variant={showOptions ? "primary" : "ghost"}
							onClick={() => panelSend({ type: "TOGGLE_OPTIONS" })}
							aria-expanded={showOptions}
						>
							<GearIcon />
							{t("export.options")}
						</Button>
					</div>
				}
			/>

			<div className="space-y-5 p-5">
				{showOptions ? (
					<>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<Choice
								label={t("export.delimiter")}
								value={options.delimiter}
								options={[
									{ value: ";", label: t("export.semicolon") },
									{ value: ",", label: t("export.comma") },
								]}
								onChange={(value) =>
									onChange({ delimiter: value as CsvOptions["delimiter"] })
								}
							/>
							<Choice
								label={t("export.dateFormat")}
								value={options.dateStyle}
								options={[
									{ value: "iso", label: "2026-05-01" },
									{ value: "dmy", label: "01-05-2026" },
								]}
								onChange={(value) =>
									onChange({ dateStyle: value as CsvOptions["dateStyle"] })
								}
							/>
							<Choice
								label={t("export.locationLabels")}
								value={options.labels}
								options={[
									{ value: "nl", label: "Kantoor / Thuis" },
									{ value: "en", label: "Office / Home" },
								]}
								onChange={(value) =>
									onChange({ labels: value as CsvOptions["labels"] })
								}
							/>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
								<Toggle
									checked={options.onlyClassified}
									onChange={(onlyClassified) => onChange({ onlyClassified })}
									label={t("export.onlyClassified")}
									hint={t("export.onlyClassifiedHint")}
								/>
								<Toggle
									checked={options.bom}
									onChange={(bom) => onChange({ bom })}
									label={t("export.bom")}
									hint={t("export.bomHint")}
								/>
							</div>
							<div>
								<p className="text-xs font-medium text-slate-600 dark:text-slate-300">
									{t("export.extraColumns")}
								</p>
								<div className="mt-2 grid grid-cols-2 gap-2">
									<Toggle
										checked={options.includeDay}
										onChange={(includeDay) => onChange({ includeDay })}
										label={t("export.weekday")}
									/>
									<Toggle
										checked={options.includeMinutes}
										onChange={(includeMinutes) => onChange({ includeMinutes })}
										label={t("export.minutes")}
									/>
									<Toggle
										checked={options.includeTimes}
										onChange={(includeTimes) => onChange({ includeTimes })}
										label={t("export.firstLast")}
									/>
									<Toggle
										checked={options.includeSource}
										onChange={(includeSource) => onChange({ includeSource })}
										label={t("export.evidence")}
									/>
									<Toggle
										checked={options.includeNotes}
										onChange={(includeNotes) => onChange({ includeNotes })}
										label={t("export.notes")}
									/>
								</div>
							</div>
						</div>
					</>
				) : (
					<p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
						{optionsSummary}
					</p>
				)}

				{reviewCount > 0 ? (
					<p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25">
						{reviewCount} day{reviewCount === 1 ? "" : "s"} still need a
						decision.
						{options.onlyClassified
							? " They are left out of this file."
							: " They are exported as Other/Unknown."}
					</p>
				) : null}

				<div>
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
								{t("export.preview")}
							</h3>
							<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
								{t("export.previewHint")}
								{hiddenByFilter > 0 && options.onlyClassified
									? ` ${t("export.leftOut", { count: hiddenByFilter })}`
									: ""}
							</p>
						</div>
						<div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
							{(
								[
									["table", "Table"],
									["text", t("export.csvText")],
								] as const
							).map(([value, label]) => (
								<button
									key={value}
									type="button"
									onClick={() => panelSend({ type: "SET_VIEW", view: value })}
									aria-pressed={view === value}
									className={cn(
										"rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
										view === value
											? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
											: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
									)}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<div className="mt-2">
						{view === "table" ? (
							<PreviewTable table={table} count={count} />
						) : (
							<pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-100 dark:bg-black/60">
								{csv.replace(/^\uFEFF/, "")}
							</pre>
						)}
					</div>

					<div className="mt-3 flex flex-wrap items-center gap-3">
						<Button variant="primary" onClick={download} disabled={count === 0}>
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								className="size-4"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"
								/>
							</svg>
							{t("export.download")}
						</Button>
						<span className="text-xs text-slate-500 dark:text-slate-400">
							<code className="font-mono">{fileName}</code> ·{" "}
							{t("export.fileNote", { file: fileName, count })}
						</span>
					</div>
				</div>
			</div>
		</Card>
	);
}

const NUMERIC_COLUMNS: CsvColumnKey[] = [
	"officeMinutes",
	"homeMinutes",
	"first",
	"last",
];

function statusTone(value: string): "office" | "home" | "other" | "muted" {
	const normalized = value.toLowerCase();
	if (normalized === "kantoor" || normalized === "office") return "office";
	if (normalized === "thuis" || normalized === "home") return "home";
	if (normalized === "anders" || normalized === "other") return "other";
	return "muted";
}

function PreviewTable({
	table,
	count,
}: {
	table: ReturnType<typeof buildCsvTable>;
	count: number;
}) {
	const { t } = useI18n();
	if (count === 0) {
		return (
			<div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
				<p className="text-sm font-medium text-slate-700 dark:text-slate-200">
					{t("export.noRowsTitle")}
				</p>
				<p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
					{t("export.noRowsHint")}
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
			<div className="max-h-[420px] overflow-auto">
				<table className="w-full border-collapse text-sm">
					<caption className="sr-only">{t("export.preview")}</caption>
					<thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
						<tr>
							{table.columns.map((column) => (
								<th
									key={column.key}
									scope="col"
									className={cn(
										"whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400",
										NUMERIC_COLUMNS.includes(column.key) && "text-right",
									)}
								>
									{column.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{table.rows.map((cells, rowIndex) => (
							<tr
								// biome-ignore lint/suspicious/noArrayIndexKey: rendered from a static table snapshot
								key={rowIndex}
								className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/30"
							>
								{cells.map((value, cellIndex) => {
									const column = table.columns[cellIndex];
									return (
										<td
											key={column.key}
											className={cn(
												"whitespace-nowrap border-b border-slate-100 px-3 py-1.5 text-slate-700 last:border-0 dark:border-slate-800 dark:text-slate-200",
												NUMERIC_COLUMNS.includes(column.key) &&
													"text-right tabular-nums",
												column.key === "date" &&
													"font-medium text-slate-900 dark:text-slate-100",
												column.key === "day" && "capitalize text-slate-500",
												column.key === "note" &&
													"text-xs text-slate-500 dark:text-slate-400",
												column.key === "source" &&
													"text-xs text-slate-500 dark:text-slate-400",
											)}
										>
											{column.key === "status" ? (
												<Badge tone={statusTone(value)}>{value}</Badge>
											) : (
												value || t("export.emptyCell")
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
				<span>{t("export.row", { count: table.rows.length })}</span>
				<span>{t("export.scrollHint")}</span>
			</div>
		</div>
	);
}

function Choice({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: Array<{ value: string; label: string }>;
	onChange: (value: string) => void;
}) {
	return (
		<div>
			<p className="text-xs font-medium text-slate-600 dark:text-slate-300">
				{label}
			</p>
			<div className="mt-1.5 flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
				{options.map((option) => (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						className={cn(
							"flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
							value === option.value
								? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
								: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
						)}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}
