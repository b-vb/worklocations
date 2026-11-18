import { useI18n } from "../lib/i18n";
import type { DayRow, SummaryData } from "../lib/timeline/days";
import { Card, cn, Stat } from "./ui";

type Props = {
	rows: DayRow[];
	summary: SummaryData;
};

export function Summary({ rows, summary }: Props) {
	const { t } = useI18n();
	const total = Math.max(1, summary.days);
	const segments = [
		{
			label: t("status.office"),
			value: summary.office,
			className: "bg-sky",
		},
		{
			label: t("status.home"),
			value: summary.home,
			className: "bg-mint",
		},
		{
			label: t("status.other"),
			value: summary.other,
			className: "bg-sun",
		},
		{
			label: t("status.pto"),
			value: summary.pto,
			className: "bg-lilac",
		},
		{
			label: t("status.no-data"),
			value: summary.noData,
			className: "bg-ink/20 dark:bg-white/15",
		},
	];

	const overridden = rows.filter((row) => row.override !== undefined).length;

	return (
		<Card className="p-5">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
				<Stat
					label={t("summary.days")}
					value={summary.days}
					hint={t("summary.daysHint")}
				/>
				<Stat
					label={t("summary.office")}
					value={summary.office}
					hint={t("summary.percent", {
						percent: Math.round((summary.office / total) * 100),
					})}
					tone="office"
				/>
				<Stat
					label={t("summary.home")}
					value={summary.home}
					hint={t("summary.percent", {
						percent: Math.round((summary.home / total) * 100),
					})}
					tone="home"
				/>
				<Stat
					label={t("summary.pto")}
					value={summary.pto}
					hint={t("summary.daysHint")}
					tone="pto"
				/>
				<Stat
					label={t("summary.review")}
					value={summary.review}
					hint={
						overridden > 0
							? t("summary.override", { count: overridden })
							: t("summary.reviewHint")
					}
					tone={summary.review > 0 ? "other" : "ok"}
				/>
			</div>

			<div className="mt-5">
				<div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
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
