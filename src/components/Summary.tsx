import type { DayRow, SummaryData } from "../lib/timeline/days";
import { Card, cn, Stat } from "./ui";

type Props = {
	rows: DayRow[];
	summary: SummaryData;
};

export function Summary({ rows, summary }: Props) {
	const total = Math.max(1, summary.days);
	const segments = [
		{
			label: "Office",
			value: summary.office,
			className: "bg-indigo-500 dark:bg-indigo-400",
		},
		{
			label: "Home",
			value: summary.home,
			className: "bg-emerald-500 dark:bg-emerald-400",
		},
		{
			label: "Other",
			value: summary.other,
			className: "bg-amber-400 dark:bg-amber-300",
		},
		{
			label: "No data",
			value: summary.noData,
			className: "bg-slate-300 dark:bg-slate-700",
		},
	];

	const overridden = rows.filter((row) => row.override !== undefined).length;

	return (
		<Card className="p-5">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Stat
					label="Working days"
					value={summary.days}
					hint="in the selected range"
				/>
				<Stat
					label="Office"
					value={summary.office}
					hint={`${Math.round((summary.office / total) * 100)}% of days`}
					tone="office"
				/>
				<Stat
					label="Home"
					value={summary.home}
					hint={`${Math.round((summary.home / total) * 100)}% of days`}
					tone="home"
				/>
				<Stat
					label="To review"
					value={summary.review}
					hint={
						overridden > 0
							? `${overridden} manual override(s)`
							: "other places or no data"
					}
					tone={summary.review > 0 ? "other" : "ok"}
				/>
			</div>

			<div className="mt-5">
				<div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
					{segments.map((segment) =>
						segment.value > 0 ? (
							<div
								key={segment.label}
								className={cn(segment.className, "h-full")}
								style={{ width: `${(segment.value / total) * 100}%` }}
								title={`${segment.label}: ${segment.value}`}
							/>
						) : null,
					)}
				</div>
				<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
					{segments.map((segment) => (
						<span
							key={segment.label}
							className="inline-flex items-center gap-1.5"
						>
							<span className={cn("size-2 rounded-full", segment.className)} />
							{segment.label} {segment.value}
						</span>
					))}
				</div>
			</div>
		</Card>
	);
}
