import type { AppSettings } from "../lib/settings";
import { addDaysKey, DAY_MS, dayKey, dayKeyToWallStart } from "../lib/time";
import {
	Badge,
	Button,
	Card,
	cn,
	Field,
	SectionHeader,
	TextInput,
	Toggle,
} from "./ui";

export type Range = { from: string; to: string };

type Props = {
	settings: AppSettings;
	range: Range;
	bounds: { min: string; max: string };
	onRangeChange: (range: Range) => void;
	onSettingsChange: (patch: Partial<AppSettings>) => void;
	onContinue?: () => void;
};

const PRESETS = [
	{ id: "2m", label: "Last 2 months" },
	{ id: "6m", label: "Last 6 months" },
	{ id: "12m", label: "Last 12 months" },
	{ id: "year", label: "This year" },
	{ id: "all", label: "All data" },
] as const;

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function RangeControls({
	settings,
	range,
	bounds,
	onRangeChange,
	onSettingsChange,
	onContinue,
}: Props) {
	const applyPreset = (preset: (typeof PRESETS)[number]["id"]) => {
		if (preset === "all") {
			onRangeChange({ from: bounds.min, to: bounds.max });
			return;
		}
		if (preset === "2m") {
			onRangeChange({ from: addDaysKey(bounds.max, -62), to: bounds.max });
			return;
		}
		if (preset === "6m") {
			onRangeChange({ from: addDaysKey(bounds.max, -183), to: bounds.max });
			return;
		}
		if (preset === "12m") {
			onRangeChange({ from: addDaysKey(bounds.max, -365), to: bounds.max });
			return;
		}
		const yearStart = `${dayKey(dayKeyToWallStart(bounds.max)).slice(0, 4)}-01-01`;
		onRangeChange({ from: yearStart, to: bounds.max });
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
				title="Which period, and what counts as a working day?"
				description="AFAS only allows a limited backfill window, so start with that period and export in chunks if needed."
				action={
					<Badge tone="muted">
						{bounds.min} → {bounds.max}
					</Badge>
				}
			/>

			<div className="space-y-6 p-5">
				<div className="flex flex-wrap items-end gap-3">
					<Field label="From" className="w-full sm:w-40">
						<TextInput
							type="date"
							aria-label="Period from"
							value={range.from}
							min={bounds.min}
							max={range.to}
							onChange={(event) =>
								onRangeChange({ ...range, from: event.target.value })
							}
						/>
					</Field>
					<Field label="To" className="w-full sm:w-40">
						<TextInput
							type="date"
							aria-label="Period to"
							value={range.to}
							min={range.from}
							max={bounds.max}
							onChange={(event) =>
								onRangeChange({ ...range, to: event.target.value })
							}
						/>
					</Field>
					<div className="flex flex-wrap gap-1.5 pb-0.5">
						{PRESETS.map((preset) => (
							<Button
								key={preset.id}
								size="sm"
								onClick={() => applyPreset(preset.id)}
							>
								{preset.label}
							</Button>
						))}
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<div>
						<p className="text-xs font-medium text-slate-600 dark:text-slate-300">
							Working days
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
											? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
											: "border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800",
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
								label="Skip Dutch public holidays"
								hint="Easter-based, Koningsdag, Christmas, and friends. Override any day manually in the table."
							/>
						</div>
					</div>

					<div>
						<Field
							label="Working hours"
							hint="Only time inside this window decides whether a day is office, home, or other. Sleep and evenings are ignored."
						>
							<div className="flex items-center gap-2">
								<TextInput
									type="number"
									aria-label="Working hours start"
									min={0}
									max={23}
									value={settings.windowStartHour}
									onChange={(event) =>
										onSettingsChange({
											windowStartHour: clampHour(Number(event.target.value), 7),
										})
									}
									className="w-20"
								/>
								<span className="text-sm text-slate-500 dark:text-slate-400">
									to
								</span>
								<TextInput
									type="number"
									aria-label="Working hours end"
									min={1}
									max={24}
									value={settings.windowEndHour}
									onChange={(event) =>
										onSettingsChange({
											windowEndHour: clampHour(Number(event.target.value), 19),
										})
									}
									className="w-20"
								/>
								<span className="text-sm text-slate-500 dark:text-slate-400">
									hours
								</span>
							</div>
						</Field>
					</div>

					<div>
						<Field
							label="Minimum time at the office"
							hint="Days with less office time than this are classified as home (or flagged for review)."
						>
							<div className="flex items-center gap-2">
								<TextInput
									type="number"
									aria-label="Minimum time at the office in minutes"
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
									minutes
								</span>
							</div>
						</Field>
						<div className="mt-2 flex flex-wrap gap-1.5">
							{[30, 60, 120, 240].map((value) => (
								<Button
									key={value}
									size="sm"
									onClick={() => onSettingsChange({ minOfficeMinutes: value })}
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
			</div>

			{onContinue ? (
				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
					<p className="text-xs text-slate-500 dark:text-slate-400">
						Changing the period updates the day table below instantly.
					</p>
					<Button variant="primary" size="sm" onClick={onContinue}>
						Next: check the days
					</Button>
				</div>
			) : null}
		</Card>
	);
}

export function rangeBounds(
	startWall: number,
	endWall: number,
): { min: string; max: string } {
	return {
		min: dayKey(startWall),
		max: dayKey(Math.max(startWall, endWall - DAY_MS / 2)),
	};
}

function clampHour(value: number, fallback: number): number {
	if (!Number.isFinite(value)) return fallback;
	return Math.min(24, Math.max(0, Math.round(value)));
}
