import { useActor } from "@xstate/react";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import { DayTable } from "./components/DayTable";
import { DropZone } from "./components/DropZone";
import { ExportPanel } from "./components/ExportPanel";
import { LocalDataPanel } from "./components/LocalDataPanel";
import { LocaleSwitcher } from "./components/LocaleSwitcher";
import { PlaceSetup } from "./components/PlaceSetup";
import {
	type Range,
	RangeControls,
	rangeBounds,
} from "./components/RangeControls";
import { Summary } from "./components/Summary";
import { Badge, Button, Card, SectionHeader } from "./components/ui";
import { holidaysInRange } from "./lib/holidays";
import { useI18n } from "./lib/i18n";
import { type AppSettings, saveOverrides, saveSettings } from "./lib/settings";
import {
	buildDayRows,
	clusterPlaces,
	type Override,
	summarize,
} from "./lib/timeline/days";
import { importMachine } from "./machines/importMachine";
import { periodMachine } from "./machines/periodMachine";
import { preferencesMachine } from "./machines/preferencesMachine";

function scrollTo(ref: RefObject<HTMLDivElement | null>) {
	ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const FORMAT_LABEL: Record<string, string> = {
	device: "format.device",
};

export function Home() {
	const { t, formatDay } = useI18n();
	const [importSnapshot, importSend] = useActor(importMachine);
	const [preferencesSnapshot, preferencesSend] = useActor(preferencesMachine);
	const [periodSnapshot, periodSend] = useActor(periodMachine);

	const { settings, overrides } = preferencesSnapshot.context;
	const history = importSnapshot.context.history;
	const busy = importSnapshot.matches("importing");
	const error = importSnapshot.context.error;
	const showUpload = importSnapshot.context.uploaderOpen;
	const showDetails = importSnapshot.context.detailsOpen;
	const placesRef = useRef<HTMLDivElement | null>(null);
	const periodRef = useRef<HTMLDivElement | null>(null);
	const resultRef = useRef<HTMLDivElement | null>(null);
	const scrolledFor = useRef(0);
	const officeRef = useRef(settings.office);
	officeRef.current = settings.office;

	const office = settings.office;
	const range: Range | null = periodSnapshot.matches("selected")
		? { from: periodSnapshot.context.from, to: periodSnapshot.context.to }
		: null;

	const progress = useMemo(() => {
		if (!busy) return null;
		const current = importSnapshot.context.progress;
		if (!current) return t("drop.reading");
		if (current.phase === "reading") {
			return t("drop.readingFile", {
				name: current.name,
				index: current.index,
				total: current.total,
			});
		}
		return t("drop.building");
	}, [busy, importSnapshot.context.progress, t]);

	useEffect(() => saveSettings(settings), [settings]);
	useEffect(() => saveOverrides(overrides), [overrides]);

	const bounds = useMemo(() => {
		if (!history?.range) return null;
		return rangeBounds(history.range.startWall, history.range.endWall);
	}, [history]);

	useEffect(() => {
		if (bounds) {
			periodSend({ type: "HISTORY_READY", bounds });
		} else {
			periodSend({ type: "HISTORY_CLEARED" });
		}
	}, [bounds, periodSend]);

	useEffect(() => {
		if (!history) {
			scrolledFor.current = 0;
			return;
		}
		const completed = importSnapshot.context.completed;
		if (!completed || scrolledFor.current === completed) return;
		scrolledFor.current = completed;
		if (history.warnings.length > 0) return;
		if (history.visits.length === 0 && history.points.length === 0) return;
		const target = officeRef.current ? periodRef : placesRef;
		const timer = window.setTimeout(() => scrollTo(target), 150);
		return () => window.clearTimeout(timer);
	}, [importSnapshot.context.completed, history]);

	const handleFiles = (files: File[]) => {
		importSend({ type: "FILES", files });
	};

	const clusters = useMemo(
		() => (history ? clusterPlaces(history) : []),
		[history],
	);

	const classify = useMemo(() => {
		if (!range) return null;
		return {
			from: range.from,
			to: range.to,
			office: settings.office,
			home: settings.home,
			minOfficeMinutes: settings.minOfficeMinutes,
			workWindow: {
				startHour: settings.windowStartHour,
				endHour: settings.windowEndHour,
			},
		};
	}, [
		range,
		settings.office,
		settings.home,
		settings.minOfficeMinutes,
		settings.windowStartHour,
		settings.windowEndHour,
	]);

	const rows = useMemo(() => {
		if (!history || !classify || !range || !classify.office) return [];
		return buildDayRows(history, classify, {
			workdays: settings.workdays,
			excludeHolidays: settings.excludeHolidays,
			holidays: holidaysInRange(range.from, range.to),
			overrides,
		});
	}, [
		history,
		classify,
		range,
		settings.workdays,
		settings.excludeHolidays,
		overrides,
	]);

	const summary = useMemo(() => summarize(rows), [rows]);

	const totalVisits = history?.visits.length ?? 0;
	const totalPoints = history?.points.length ?? 0;

	const updateSettings = (patch: Partial<AppSettings>) => {
		preferencesSend({ type: "SETTINGS_PATCH", patch });
	};

	const setOverride = (date: string, override: Override | undefined) => {
		preferencesSend({ type: "SET_OVERRIDE", date, override });
	};

	const resetSavedSettings = () => {
		const confirmed = window.confirm(t("footer.resetConfirm"));
		if (!confirmed) return;
		preferencesSend({ type: "RESET_ALL" });
		importSend({ type: "CLOSE_UPLOADER" });
		if (showDetails) importSend({ type: "TOGGLE_DETAILS" });
		if (history) {
			window.setTimeout(() => scrollTo(placesRef), 120);
		} else {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
			<header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								className="size-5"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M4 19V9m4 10V5m4 14v-7m4 7V8m4 11v-4"
								/>
							</svg>
						</div>
						<h1 className="text-base font-semibold tracking-tight">
							{t("app.title")}
						</h1>
					</div>
					<div className="flex items-center gap-2">
						<LocaleSwitcher />
						<Badge tone="ok">
							<span className="size-1.5 rounded-full bg-emerald-500" />
							{t("app.noUploads")}
						</Badge>
						{history ? (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => importSend({ type: "CLOSE" })}
							>
								{t("app.closeData")}
							</Button>
						) : null}
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
				{!history ? (
					<>
						<div>
							<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
								{t("intro.title")}
							</h2>
							<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
								{t("intro.subtitle")}
							</p>
						</div>
						<div className="grid gap-4 sm:grid-cols-3">
							{[
								{
									title: t("intro.step1.title"),
									body: t("intro.step1.body"),
								},
								{
									title: t("intro.step2.title"),
									body: t("intro.step2.body"),
								},
								{
									title: t("intro.step3.title"),
									body: t("intro.step3.body"),
								},
							].map((item) => (
								<Card key={item.title} className="p-4">
									<p className="text-sm font-semibold">{item.title}</p>
									<p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
										{item.body}
									</p>
								</Card>
							))}
						</div>
						<DropZone
							onFiles={handleFiles}
							busy={busy}
							progress={progress}
							error={error}
							hasHistory={false}
						/>
						{import.meta.env.DEV ? (
							<LocalDataPanel
								onFile={(file) => handleFiles([file])}
								disabled={busy}
							/>
						) : null}
					</>
				) : (
					<>
						<Card>
							<SectionHeader
								step="1"
								title={t("loaded.title")}
								description={t("loaded.description")}
								action={
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											variant="ghost"
											onClick={() => importSend({ type: "TOGGLE_DETAILS" })}
											aria-expanded={showDetails}
										>
											{showDetails
												? t("loaded.hideDetails")
												: t("loaded.details")}
										</Button>
										<Button
											size="sm"
											variant={showUpload ? "primary" : "secondary"}
											onClick={() =>
												importSend({
													type: showUpload ? "CLOSE_UPLOADER" : "OPEN_UPLOADER",
												})
											}
										>
											{showUpload ? t("loaded.done") : t("loaded.replace")}
										</Button>
									</div>
								}
							/>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
								<Badge tone="muted">
									{t("loaded.file", { count: history.files.length })}
								</Badge>
								<Badge tone="info">
									{t("loaded.visit", { count: totalVisits })}
								</Badge>
								{totalPoints > 0 ? (
									<Badge tone="info">
										{t("loaded.point", { count: totalPoints })}
									</Badge>
								) : null}
								{history.range && bounds ? (
									<span className="text-slate-500 dark:text-slate-400">
										{t("loaded.available", {
											from: formatDay(bounds.min),
											to: formatDay(bounds.max),
										})}
									</span>
								) : null}
								{history.warnings.length > 0 ? (
									<button
										type="button"
										onClick={() => importSend({ type: "TOGGLE_DETAILS" })}
										className="ml-auto text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
									>
										{t("loaded.warning", { count: history.warnings.length })}
									</button>
								) : null}
							</div>
							{showDetails ? (
								<div className="mx-5 mb-4 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
										{t("loaded.filesHeading")}
									</p>
									{history.files.map((file) => (
										<p key={file.name} className="font-mono">
											{file.name} ·{" "}
											{t(FORMAT_LABEL[file.format] ?? "format.device")} ·{" "}
											{t("loaded.visit", { count: file.visits })} ·{" "}
											{t("loaded.point", { count: file.points })}
											{file.error ? ` · ${file.error}` : ""}
										</p>
									))}
									{history.warnings.length > 0 ? (
										<p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
											{t("loaded.warningsHeading")}
										</p>
									) : null}
									{history.warnings.map((warning) => (
										<p
											key={warning}
											className="text-amber-700 dark:text-amber-400"
										>
											{warning}
										</p>
									))}
								</div>
							) : null}
						</Card>

						{showUpload ? (
							<DropZone
								onFiles={handleFiles}
								busy={busy}
								progress={progress}
								error={error}
								hasHistory
							/>
						) : null}
						{import.meta.env.DEV ? (
							<LocalDataPanel
								onFile={(file) => handleFiles([file])}
								disabled={busy}
							/>
						) : null}

						<div ref={placesRef} className="scroll-mt-4">
							<PlaceSetup
								settings={settings}
								clusters={clusters}
								onChange={updateSettings}
								onContinue={() => scrollTo(periodRef)}
							/>
						</div>

						{office && bounds && range ? (
							<div ref={periodRef} className="scroll-mt-4">
								<RangeControls
									settings={settings}
									range={range}
									bounds={bounds}
									advanced={periodSnapshot.context.advanced}
									onFromChange={(value) =>
										periodSend({ type: "FROM_CHANGED", value })
									}
									onToChange={(value) =>
										periodSend({ type: "TO_CHANGED", value })
									}
									onPreset={(preset) => periodSend({ type: "PRESET", preset })}
									onToggleAdvanced={() =>
										periodSend({ type: "TOGGLE_ADVANCED" })
									}
									onSettingsChange={updateSettings}
									onContinue={() => scrollTo(resultRef)}
								/>
							</div>
						) : null}

						{office ? (
							<>
								<div
									ref={resultRef}
									className="scroll-mt-4 flex items-center gap-2"
								>
									<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
										Result
									</h2>
									<span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
								</div>

								<Summary rows={rows} summary={summary} />
								<DayTable
									key={importSnapshot.context.completed}
									rows={rows}
									onOverride={setOverride}
									onResetOverrides={() =>
										preferencesSend({ type: "CLEAR_OVERRIDES" })
									}
								/>
								<ExportPanel
									rows={rows}
									options={settings.csv}
									onChange={(patch) =>
										updateSettings({ csv: { ...settings.csv, ...patch } })
									}
								/>
							</>
						) : null}
					</>
				)}

				<div className="flex flex-col items-center gap-2 pb-8 pt-2">
					<p className="text-center text-xs text-slate-400 dark:text-slate-500">
						{t("footer.privacy")}
					</p>
					<Button size="sm" variant="ghost" onClick={resetSavedSettings}>
						{t("footer.reset")}
					</Button>
				</div>
			</main>
		</div>
	);
}
