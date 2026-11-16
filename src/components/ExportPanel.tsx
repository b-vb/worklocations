import { useMemo } from "react";
import {
	type CsvOptions,
	csvFileName,
	exportRowsCount,
	rowsToCsv,
} from "../lib/csv";
import type { DayRow } from "../lib/timeline/days";
import { Badge, Button, Card, cn, SectionHeader, Toggle } from "./ui";

type Props = {
	rows: DayRow[];
	range: { from: string; to: string };
	options: CsvOptions;
	onChange: (patch: Partial<CsvOptions>) => void;
};

export function ExportPanel({ rows, range, options, onChange }: Props) {
	const count = exportRowsCount(rows, options);
	const csv = useMemo(() => rowsToCsv(rows, options), [rows, options]);
	const preview = useMemo(
		() =>
			csv
				.replace(/^\uFEFF/, "")
				.split("\r\n")
				.slice(0, 6)
				.join("\n"),
		[csv],
	);
	const reviewCount = rows.filter(
		(row) => row.included && row.needsReview,
	).length;

	const download = () => {
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = csvFileName(range.from, range.to);
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	return (
		<Card>
			<SectionHeader
				step="5"
				title="Export for AFAS"
				description="The CSV opens in Excel. Dutch labels and semicolons by default, because that is what Excel expects here."
				action={<Badge tone={count > 0 ? "ok" : "warn"}>{count} rows</Badge>}
			/>

			<div className="grid gap-6 p-5 lg:grid-cols-2">
				<div className="space-y-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<Choice
							label="Delimiter"
							value={options.delimiter}
							options={[
								{ value: ";", label: "Semicolon ;" },
								{ value: ",", label: "Comma ," },
							]}
							onChange={(value) =>
								onChange({ delimiter: value as CsvOptions["delimiter"] })
							}
						/>
						<Choice
							label="Date format"
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
							label="Labels"
							value={options.labels}
							options={[
								{ value: "nl", label: "Kantoor / Thuis" },
								{ value: "en", label: "Office / Home" },
							]}
							onChange={(value) =>
								onChange({ labels: value as CsvOptions["labels"] })
							}
						/>
						<div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
							<Toggle
								checked={options.onlyClassified}
								onChange={(onlyClassified) => onChange({ onlyClassified })}
								label="Only office/home rows"
								hint="Leave out days that still say Other or No data."
							/>
							<Toggle
								checked={options.bom}
								onChange={(bom) => onChange({ bom })}
								label="UTF-8 BOM"
								hint="Keeps accents intact in Excel."
							/>
						</div>
					</div>

					<div>
						<p className="text-xs font-medium text-slate-600 dark:text-slate-300">
							Extra columns
						</p>
						<div className="mt-2 grid gap-2 sm:grid-cols-2">
							<Toggle
								checked={options.includeDay}
								onChange={(includeDay) => onChange({ includeDay })}
								label="Weekday"
							/>
							<Toggle
								checked={options.includeMinutes}
								onChange={(includeMinutes) => onChange({ includeMinutes })}
								label="Minutes office/home"
							/>
							<Toggle
								checked={options.includeTimes}
								onChange={(includeTimes) => onChange({ includeTimes })}
								label="First/last seen"
							/>
							<Toggle
								checked={options.includeSource}
								onChange={(includeSource) => onChange({ includeSource })}
								label="Evidence source"
							/>
							<Toggle
								checked={options.includeNotes}
								onChange={(includeNotes) => onChange({ includeNotes })}
								label="Notes (holiday, manual)"
							/>
						</div>
					</div>

					{reviewCount > 0 ? (
						<p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25">
							{reviewCount} day{reviewCount === 1 ? "" : "s"} still need a
							decision.
							{options.onlyClassified
								? " They are excluded from this export."
								: " They will be exported as Other/Unknown."}
						</p>
					) : null}
				</div>

				<div className="flex flex-col">
					<div className="flex items-center justify-between">
						<p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
							Preview
						</p>
						<Badge tone="muted">{csvFileName(range.from, range.to)}</Badge>
					</div>
					<pre className="mt-2 min-h-40 flex-1 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-100 dark:bg-black/60">
						{preview}
					</pre>
					<div className="mt-3 flex flex-wrap items-center gap-3">
						<Button variant="primary" onClick={download} disabled={count === 0}>
							Download CSV
						</Button>
						<span className="text-xs text-slate-500 dark:text-slate-400">
							{count} data row{count === 1 ? "" : "s"}, nothing uploaded.
						</span>
					</div>
				</div>
			</div>
		</Card>
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
