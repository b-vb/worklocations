import { useI18n } from "../lib/i18n";
import type { DayRange, PeriodBounds } from "../lib/period";
import type { AppSettings } from "../lib/settings";
import { clampHour } from "../lib/time";
import type { PeriodPreset } from "../machines/periodMachine";
import {
	Button,
	Card,
	cn,
	Field,
	formatDuration,
	GearIcon,
	SectionHeader,
	TextInput,
	Toggle,
} from "./ui";

type Props = {
	settings: AppSettings;
	range: DayRange;
	bounds: PeriodBounds;
	advanced: boolean;
	onFromChange: (value: string) => void;
	onToChange: (value: string) => void;
	onPreset: (preset: PeriodPreset) => void;
	onToggleAdvanced: () => void;
	onSettingsChange: (patch: Partial<AppSettings>) => void;
	onContinue?: () => void;
};

const PRESETS = [
	{ id: "2m", labelKey: "period.preset2m" },
	{ id: "6m", labelKey: "period.preset6m" },
	{ id: "12m", labelKey: "period.preset12m" },
	{ id: "year", labelKey: "period.presetYear" },
	{ id: "all", labelKey: "period.presetAll" },
] as const;

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function RangeControls({
	settings,
	range,
	bounds,
	advanced,
	onFromChange,
	onToChange,
	onPreset,
	onToggleAdvanced,
	onSettingsChange,
	onContinue,
}: Props) {
	const { t, formatWeekday } = useI18n();
	const summaryWorkdays = () => {
		const active = settings.workdays
			.map((on, index) => (on ? formatWeekday(index) : null))
			.filter((day): day is string => day !== null);
		if (active.length === 0) return t("period.noWorkdays");
		if (active.length === 7) return t("period.everyDay");
		if (
			settings.workdays[1] &&
			settings.workdays[2] &&
			settings.workdays[3] &&
			settings.workdays[4] &&
			settings.workdays[5] &&
			!settings.workdays[0] &&
			!settings.workdays[6]
		) {
			return t("period.monFri");
		}
		return active.join(", ");
	};

	const setWorkday = (index: number, value: boolean) => {
		const workdays = [...settings.workdays];
		workdays[index] = value;
		onSettingsChange({ workdays });
	};

	return (
		<Card>
			<SectionHeader
				step="3"
				title={t("period.title")}
				description={t("period.description")}
				action={
					<Button
						size="sm"
						variant={advanced ? "primary" : "ghost"}
						onClick={onToggleAdvanced}
						aria-expanded={advanced}
					>
						<GearIcon />
						{t("period.options")}
					</Button>
				}
			/>

			<div className="space-y-5 p-5">
				<div className="flex flex-wrap items-end gap-3">
					<Field label={t("period.from")} className="w-full sm:w-40">
						<TextInput
							type="date"
							aria-label={t("period.from")}
							value={range.from}
							min={bounds.min}
							max={range.to}
							onChange={(event) => onFromChange(event.target.value)}
						/>
					</Field>
					<Field label={t("period.to")} className="w-full sm:w-40">
						<TextInput
							type="date"
							aria-label={t("period.to")}
							value={range.to}
							min={range.from}
							max={bounds.max}
							onChange={(event) => onToChange(event.target.value)}
						/>
					</Field>
					<div className="flex flex-wrap gap-1.5 pb-0.5">
						{PRESETS.map((preset) => (
							<Button
								key={preset.id}
								size="sm"
								onClick={() => onPreset(preset.id)}
							>
								{t(preset.labelKey)}
							</Button>
						))}
					</div>
				</div>

				{advanced ? (
					<div className="grid gap-6 border-t-2 border-ink/8 pt-5 md:grid-cols-2 dark:border-white/10">
						<div>
							<p className="text-xs font-medium text-slate-600 dark:text-slate-300">
								{t("period.workingDays")}
							</p>
							<div className="mt-2 flex gap-1.5">
								{WEEKDAY_ORDER.map((weekday, index) => (
									<button
										key={weekday}
										type="button"
										onClick={() =>
											setWorkday(weekday, !settings.workdays[weekday])
										}
										className={cn(
											"size-9 rounded-lg text-sm font-medium transition-colors",
											settings.workdays[weekday]
												? "bg-coral text-white shadow-[0_2px_0_#c94a4a]"
												: "border-2 border-ink/12 text-ink/55 hover:bg-sun/25 dark:border-white/10 dark:text-white/55 dark:hover:bg-white/10",
										)}
										aria-pressed={settings.workdays[weekday]}
									>
										{WEEKDAY_LABELS[index]}
									</button>
								))}
							</div>

							<div className="mt-4">
								<Toggle
									checked={settings.excludeHolidays}
									onChange={(excludeHolidays) =>
										onSettingsChange({ excludeHolidays })
									}
									label={t("period.holidays")}
									hint={t("period.holidaysHint")}
								/>
							</div>
						</div>

						<div>
							<Field label={t("period.window")} hint={t("period.windowHint")}>
								<div className="flex items-center gap-2">
									<TextInput
										type="number"
										aria-label={t("period.windowStartAria")}
										min={0}
										max={23}
										value={settings.windowStartHour}
										onChange={(event) =>
											onSettingsChange({
												windowStartHour: clampHour(
													Number(event.target.value),
													7,
												),
											})
										}
										className="w-20"
									/>
									<span className="text-sm text-slate-500 dark:text-slate-400">
										{t("period.to")}
									</span>
									<TextInput
										type="number"
										aria-label={t("period.windowEndAria")}
										min={1}
										max={24}
										value={settings.windowEndHour}
										onChange={(event) =>
											onSettingsChange({
												windowEndHour: clampHour(
													Number(event.target.value),
													19,
												),
											})
										}
										className="w-20"
									/>
									<span className="text-sm text-slate-500 dark:text-slate-400">
										{t("period.hours")}
									</span>
								</div>
							</Field>
						</div>

						<div>
							<Field
								label={t("period.minOffice")}
								hint={t("period.minOfficeHint")}
							>
								<div className="flex items-center gap-2">
									<TextInput
										type="number"
										aria-label={t("period.minOffice")}
										min={0}
										max={720}
										step={15}
										value={settings.minOfficeMinutes}
										onChange={(event) =>
											onSettingsChange({
												minOfficeMinutes: Math.max(
													0,
													Number(event.target.value) || 0,
												),
											})
										}
										className="w-24"
									/>
									<span className="text-sm text-slate-500 dark:text-slate-400">
										{t("period.minutes")}
									</span>
								</div>
							</Field>
							<div className="mt-2 flex flex-wrap gap-1.5">
								{[30, 60, 120, 240].map((value) => (
									<Button
										key={value}
										size="sm"
										onClick={() =>
											onSettingsChange({ minOfficeMinutes: value })
										}
									>
										{value < 60 ? `${value}m` : `${value / 60}h`}
									</Button>
								))}
							</div>
							<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
								A normal office day is detected from the moment you arrive until
								you leave, so 2 hours is a safe threshold for "I was there long
								enough to matter".
							</p>
						</div>
					</div>
				) : (
					<p className="rounded-lg bg-sun/20 px-3 py-2 text-xs font-medium text-ink/65 dark:bg-white/5 dark:text-white/60">
						{summaryWorkdays()} ·{" "}
						{String(settings.windowStartHour).padStart(2, "0")}:00–
						{String(settings.windowEndHour).padStart(2, "0")}:00 ·{" "}
						{t("period.officeAtLeast", {
							min:
								settings.minOfficeMinutes > 0
									? formatDuration(settings.minOfficeMinutes)
									: "0m",
						})}{" "}
						·{" "}
						{settings.excludeHolidays
							? t("period.holidaysSkipped")
							: t("period.holidaysIncluded")}
					</p>
				)}
			</div>

			{onContinue ? (
				<div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/8 px-5 py-3 dark:border-white/10">
					<p className="text-xs text-slate-500 dark:text-slate-400">
						{t("period.nextHint")}
					</p>
					<Button variant="primary" size="sm" onClick={onContinue}>
						{t("period.next")}
					</Button>
				</div>
			) : null}
		</Card>
	);
}
