import { useMemo, useState } from "react";
import { dayKeyToWallStart, formatClock } from "../lib/time";
import type { DayRow, DayStatus, Override } from "../lib/timeline/days";
import {
	Badge,
	Button,
	Card,
	cn,
	formatDuration,
	SectionHeader,
	Select,
	SLICE_CLASSES,
} from "./ui";

type Props = {
	rows: DayRow[];
	onOverride: (date: string, override: Override | undefined) => void;
	onResetOverrides: () => void;
};

type Filter = "included" | "review" | "all";

const STATUS_TONE: Record<DayStatus, "office" | "home" | "other" | "muted"> = {
	office: "office",
	home: "home",
	other: "other",
	"no-data": "muted",
};

const STATUS_LABEL: Record<DayStatus, string> = {
	office: "Office",
	home: "Home",
	other: "Other",
	"no-data": "No data",
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shortDate(date: string): string {
	const value = new Date(dayKeyToWallStart(date));
	return new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(value);
}

export function DayTable({ rows, onOverride, onResetOverrides }: Props) {
	const [filter, setFilter] = useState<Filter | null>(null);

	const reviewCount = rows.filter(
		(row) => row.included && row.needsReview,
	).length;
	const includedCount = rows.filter((row) => row.included).length;
	const overrideCount = rows.filter((row) => row.override !== undefined).length;

	// Start on the days that actually need a human decision. Once the user picks
	// a filter, their choice wins.
	const activeFilter: Filter =
		filter ?? (reviewCount > 0 ? "review" : "included");

	const filtered = useMemo(() => {
		const visible = rows.filter((row) => {
			if (activeFilter === "included") return row.included;
			if (activeFilter === "review") return row.included && row.needsReview;
			return true;
		});
		return [...visible].reverse();
	}, [rows, activeFilter]);

	return (
		<Card>
			<SectionHeader
				step="4"
				title={reviewCount > 0 ? "Days to review" : "Check the days"}
				description={
					reviewCount > 0
						? `${reviewCount} day${reviewCount === 1 ? "" : "s"} need a decision. Set the location, or skip the day.`
						: "Everything is filled in. Adjust any day if needed; changes are saved in this browser."
				}
				action={
					overrideCount > 0 ? (
						<Button size="sm" variant="ghost" onClick={onResetOverrides}>
							Reset {overrideCount} override{overrideCount === 1 ? "" : "s"}
						</Button>
					) : null
				}
			/>

			<div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
				{(
					[
						["review", `Needs review (${reviewCount})`],
						["included", `Workdays (${includedCount})`],
						["all", `All days (${rows.length})`],
					] as const
				).map(([value, label]) => (
					<Button
						key={value}
						size="sm"
						variant={activeFilter === value ? "primary" : "ghost"}
						onClick={() => setFilter(value)}
					>
						{label}
					</Button>
				))}
			</div>

			<div className="max-h-[640px] overflow-auto">
				<table className="w-full border-collapse text-sm">
					<thead className="sticky top-0 z-10 bg-white/95 backdrop-blur dark:bg-slate-900/95">
						<tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
							<th className="w-32 px-4 py-2 font-medium">Date</th>
							<th className="px-2 py-2 font-medium">Timeline</th>
							<th className="w-24 px-2 py-2 font-medium">Office</th>
							<th className="w-24 px-2 py-2 font-medium">Home</th>
							<th className="w-52 px-4 py-2 font-medium">Location</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((row) => (
							<DayLine key={row.date} row={row} onOverride={onOverride} />
						))}
						{filtered.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="px-4 py-10 text-center text-sm text-slate-500"
								>
									Nothing to show for this filter.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>

			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
				<span className="inline-flex items-center gap-1.5">
					<span className="size-2 rounded-full bg-indigo-500" /> office
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span className="size-2 rounded-full bg-emerald-500" /> home
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span className="size-2 rounded-full bg-amber-400" /> other place
				</span>
				<span className="ml-auto">
					Hidden days (weekends, holidays, skipped) are still in "All days".
				</span>
			</div>
		</Card>
	);
}

function DayLine({
	row,
	onOverride,
}: {
	row: DayRow;
	onOverride: (date: string, override: Override | undefined) => void;
}) {
	const midnight = dayKeyToWallStart(row.date);
	const selectValue = row.override ?? "auto";

	return (
		<tr
			className={cn(
				"border-b border-slate-100 last:border-0 dark:border-slate-800/80",
				row.needsReview && "bg-amber-50/60 dark:bg-amber-500/5",
				!row.included && "opacity-50",
			)}
		>
			<td className="whitespace-nowrap px-4 py-2.5">
				<div className="font-medium text-slate-800 dark:text-slate-100">
					{shortDate(row.date)}
				</div>
				<div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
					{WEEKDAY_SHORT[row.weekday]}
					{row.holiday ? (
						<span
							className="truncate text-rose-600 dark:text-rose-400"
							title={row.holiday}
						>
							· {row.holiday}
						</span>
					) : null}
				</div>
			</td>
			<td className="px-2 py-2.5">
				<div className="relative h-5 w-full min-w-40 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
					{row.slices.map((slice) => (
						<div
							key={`${slice.start}-${slice.label}`}
							className={cn(
								"absolute inset-y-0",
								SLICE_CLASSES[slice.label],
								row.override === "skip" && "opacity-30",
							)}
							style={{
								left: `${((slice.start - midnight) / 86_400_000) * 100}%`,
								width: `${Math.max(0.4, ((slice.end - slice.start) / 86_400_000) * 100)}%`,
							}}
							title={`${slice.label}: ${formatClock(slice.start)}–${formatClock(slice.end)}`}
						/>
					))}
					{[6, 12, 18].map((hour) => (
						<div
							key={hour}
							className="absolute inset-y-0 w-px bg-white/60 dark:bg-slate-900/60"
							style={{ left: `${(hour / 24) * 100}%` }}
						/>
					))}
				</div>
				<div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400 dark:text-slate-500">
					<span>{row.firstWall ? formatClock(row.firstWall) : "—"}</span>
					{row.evidence === "positions" ? <span>from positions</span> : null}
					<span>{row.lastWall ? formatClock(row.lastWall) : "—"}</span>
				</div>
			</td>
			<td className="whitespace-nowrap px-2 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
				{formatDuration(row.officeMinutes)}
			</td>
			<td className="whitespace-nowrap px-2 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
				{formatDuration(row.homeMinutes)}
			</td>
			<td className="px-4 py-2.5">
				<div className="flex items-center gap-2">
					<Badge tone={STATUS_TONE[row.finalStatus]}>
						{STATUS_LABEL[row.finalStatus]}
					</Badge>
					<Select
						value={selectValue}
						aria-label={`Location for ${row.date}`}
						onChange={(event) => {
							const value = event.target.value;
							onOverride(
								row.date,
								value === "auto" ? undefined : (value as Override),
							);
						}}
					>
						<option value="auto">Auto · {STATUS_LABEL[row.status]}</option>
						<option value="office">Office</option>
						<option value="home">Home</option>
						<option value="other">Other</option>
						<option value="skip">Skip</option>
					</Select>
				</div>
			</td>
		</tr>
	);
}
