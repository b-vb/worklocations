import { createFileRoute } from "@tanstack/react-router";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { DayTable } from "../components/DayTable";
import { DropZone } from "../components/DropZone";
import { ExportPanel } from "../components/ExportPanel";
import { LocalDataPanel } from "../components/LocalDataPanel";
import { PlaceSetup } from "../components/PlaceSetup";
import {
	type Range,
	RangeControls,
	rangeBounds,
} from "../components/RangeControls";
import { Summary } from "../components/Summary";
import { Badge, Button, Card, SectionHeader } from "../components/ui";
import { holidaysInRange } from "../lib/holidays";
import {
	type AppSettings,
	clearStoredSettings,
	defaultSettings,
	loadOverrides,
	loadSettings,
	saveOverrides,
	saveSettings,
} from "../lib/settings";
import { addDaysKey, formatDate } from "../lib/time";
import {
	buildDayRows,
	clusterPlaces,
	type Override,
	summarize,
} from "../lib/timeline/days";
import { parseTimelineFiles } from "../lib/timeline/load";
import type { ParsedHistory } from "../lib/timeline/types";

export const Route = createFileRoute("/")({ component: Home });

function plural(
	count: number,
	singular: string,
	pluralForm = `${singular}s`,
): string {
	return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
}

function Home() {
	const [history, setHistory] = useState<ParsedHistory | null>(null);
	const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
	const [overrides, setOverrides] = useState<Record<string, Override>>(() =>
		loadOverrides(),
	);
	const [range, setRange] = useState<Range | null>(null);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [showDetails, setShowDetails] = useState(false);
	const [showUpload, setShowUpload] = useState(false);
	const [showPlaces, setShowPlaces] = useState(() => settings.office === null);
	const placesRef = useRef<HTMLDivElement | null>(null);
	const periodRef = useRef<HTMLDivElement | null>(null);
	const resultRef = useRef<HTMLDivElement | null>(null);

	const office = settings.office;

	const scrollTo = (ref: RefObject<HTMLDivElement | null>) => {
		ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	useEffect(() => saveSettings(settings), [settings]);
	useEffect(() => saveOverrides(overrides), [overrides]);

	const bounds = useMemo(() => {
		if (!history?.range) return null;
		return rangeBounds(history.range.startWall, history.range.endWall);
	}, [history]);

	const applyHistory = (parsed: ParsedHistory) => {
		setHistory(parsed);
		setError(null);
		if (!parsed.range) {
			setRange(null);
			return;
		}
		const nextBounds = rangeBounds(
			parsed.range.startWall,
			parsed.range.endWall,
		);
		// Default to the last year: real exports can span a decade, and nobody
		// wants thousands of irrelevant days before picking a period.
		const twelveMonthsAgo = addDaysKey(nextBounds.max, -365);
		setRange({
			from: twelveMonthsAgo < nextBounds.min ? nextBounds.min : twelveMonthsAgo,
			to: nextBounds.max,
		});
	};

	const handleFiles = async (files: File[]) => {
		setBusy(true);
		setError(null);
		setProgress("Reading files…");
		try {
			const parsed = await parseTimelineFiles(files, setProgress);
			applyHistory(parsed);
			setShowUpload(false);
			setShowDetails(parsed.warnings.length > 0);
			// With a clean parse, move the eye to the next step. Warnings stay
			// visible instead, so they cannot be missed.
			if (
				parsed.warnings.length === 0 &&
				(parsed.visits.length > 0 || parsed.points.length > 0)
			) {
				// Settings from a previous visit mean step 2 is already done.
				const target = office ? periodRef : placesRef;
				window.setTimeout(() => scrollTo(target), 150);
			}
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Could not read the file.",
			);
		} finally {
			setBusy(false);
			setProgress(null);
		}
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
		if (!history || !classify || !range) return [];
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
		setSettings((current) => ({ ...current, ...patch }));
	};

	const setOverride = (date: string, override: Override | undefined) => {
		setOverrides((current) => {
			const next = { ...current };
			if (override === undefined) delete next[date];
			else next[date] = override;
			return next;
		});
	};

	const resetSavedSettings = () => {
		const confirmed = window.confirm(
			"Clear your saved office, home, working hours, export options and manual day overrides? The loaded file stays in this tab.",
		);
		if (!confirmed) return;
		clearStoredSettings();
		setSettings(defaultSettings);
		setOverrides({});
		setShowPlaces(true);
		setShowUpload(false);
		setShowDetails(false);
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
						<div>
							<h1 className="text-base font-semibold tracking-tight">
								Commute Log
							</h1>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Google Timeline → AFAS work location, without the spreadsheet
								archaeology
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Badge tone="ok">
							<span className="size-1.5 rounded-full bg-emerald-500" />
							no uploads
						</Badge>
						{history ? (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => {
									setHistory(null);
									setRange(null);
									setShowUpload(false);
									setShowDetails(false);
								}}
							>
								Close data
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
								How it works
							</h2>
							<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
								Three steps. Your location history never leaves this tab.
							</p>
						</div>
						<div className="grid gap-4 sm:grid-cols-3">
							{[
								{
									title: "1. Open the export",
									body: "Pick the Timeline.json from your phone. It is parsed locally in a worker, so even a 200 MB file will not freeze the page.",
								},
								{
									title: "2. Pin work and home",
									body: "Search an address or pick a place you already visit often. Everything inside the radius counts as time at that location.",
								},
								{
									title: "3. Review and export",
									body: "Pick the period, fix the odd day, then download a CSV with Datum + Kantoor/Thuis that HR can paste into AFAS.",
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
								title="Your export"
								description="Already loaded in this browser. Replace it if you have a newer export."
								action={
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											variant="ghost"
											onClick={() => setShowDetails((value) => !value)}
											aria-expanded={showDetails}
										>
											{showDetails ? "Hide details" : "Details"}
										</Button>
										<Button
											size="sm"
											variant={showUpload ? "primary" : "secondary"}
											onClick={() => setShowUpload((value) => !value)}
										>
											{showUpload ? "Done" : "Replace file"}
										</Button>
									</div>
								}
							/>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
								<Badge tone="muted">
									{plural(history.files.length, "file")}
								</Badge>
								<Badge tone="info">{plural(totalVisits, "visit")}</Badge>
								{totalPoints > 0 ? (
									<Badge tone="info">{plural(totalPoints, "point")}</Badge>
								) : null}
								{history.range ? (
									<span className="text-slate-500 dark:text-slate-400">
										{formatDate(bounds?.min ?? "", "dmy")} –{" "}
										{formatDate(bounds?.max ?? "", "dmy")} available
									</span>
								) : null}
								{history.warnings.length > 0 ? (
									<button
										type="button"
										onClick={() => setShowDetails((value) => !value)}
										className="ml-auto text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
									>
										{plural(history.warnings.length, "warning")}
									</button>
								) : null}
							</div>
							{showDetails ? (
								<div className="mx-5 mb-4 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
										Files
									</p>
									{history.files.map((file) => (
										<p key={file.name} className="font-mono">
											{file.name} · {file.format} ·{" "}
											{plural(file.visits, "visit")} ·{" "}
											{plural(file.points, "point")}
											{file.error ? ` · ${file.error}` : ""}
										</p>
									))}
									{history.warnings.length > 0 ? (
										<p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
											Warnings
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

						{showPlaces || !office ? (
							<div ref={placesRef} className="scroll-mt-4">
								<PlaceSetup
									settings={settings}
									clusters={clusters}
									onChange={updateSettings}
									onContinue={() => {
										setShowPlaces(false);
										scrollTo(periodRef);
									}}
								/>
							</div>
						) : (
							<Card>
								<SectionHeader
									step="2"
									title="Work and home"
									description="Already set up from your last visit. Change it if your office moved."
									action={
										<Button
											size="sm"
											variant="secondary"
											onClick={() => setShowPlaces(true)}
										>
											Change places
										</Button>
									}
								/>
								<div className="flex flex-wrap items-center gap-2 px-5 py-4">
									<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
										<Badge tone="office" className="max-w-full">
											<span className="truncate">
												Office · {office.label || "pinned"} ·{" "}
												{office.radiusMeters} m
											</span>
										</Badge>
										<Badge tone="home" className="max-w-full">
											<span className="truncate">
												{settings.home
													? `Home · ${settings.home.label ?? "pinned"} · ${settings.home.radiusMeters} m`
													: "Home · auto (Google HOME)"}
											</span>
										</Badge>
									</div>
									<Button
										size="sm"
										variant="primary"
										onClick={() => scrollTo(periodRef)}
									>
										Next: choose the period
									</Button>
								</div>
							</Card>
						)}

						{bounds && range ? (
							<div ref={periodRef} className="scroll-mt-4">
								<RangeControls
									settings={settings}
									range={range}
									bounds={bounds}
									onRangeChange={setRange}
									onSettingsChange={updateSettings}
									onContinue={() => scrollTo(resultRef)}
								/>
							</div>
						) : null}

						<div
							ref={resultRef}
							className="scroll-mt-4 flex items-center gap-2"
						>
							<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
								Result
							</h2>
							<span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
							{!settings.office ? (
								<Badge tone="other">no office pinned yet</Badge>
							) : null}
						</div>

						<Summary rows={rows} summary={summary} />
						<DayTable
							rows={rows}
							onOverride={setOverride}
							onResetOverrides={() => setOverrides({})}
						/>
						<ExportPanel
							rows={rows}
							range={range ?? { from: "", to: "" }}
							options={settings.csv}
							onChange={(patch) =>
								updateSettings({ csv: { ...settings.csv, ...patch } })
							}
						/>
					</>
				)}

				<div className="flex flex-col items-center gap-2 pb-8 pt-2">
					<p className="text-center text-xs text-slate-400 dark:text-slate-500">
						Location history stays in this tab. Settings and manual overrides
						are stored in localStorage on this device.
					</p>
					<Button size="sm" variant="ghost" onClick={resetSavedSettings}>
						Reset saved settings
					</Button>
				</div>
			</main>
		</div>
	);
}
