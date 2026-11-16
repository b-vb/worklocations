import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Badge, Button, Card } from "../components/ui";
import { createDemoHistory } from "../lib/demo";
import { holidaysInRange } from "../lib/holidays";
import {
	type AppSettings,
	loadOverrides,
	loadSettings,
	saveOverrides,
	saveSettings,
} from "../lib/settings";
import { formatDate } from "../lib/time";
import {
	buildDayRows,
	clusterPlaces,
	type Override,
	summarize,
} from "../lib/timeline/days";
import { parseTimelineFiles } from "../lib/timeline/load";
import type { ParsedHistory } from "../lib/timeline/types";

export const Route = createFileRoute("/")({ component: Home });

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
		setRange({ from: nextBounds.min, to: nextBounds.max });
	};

	const handleFiles = async (files: File[]) => {
		setBusy(true);
		setError(null);
		setProgress("Reading files…");
		try {
			const parsed = await parseTimelineFiles(files, setProgress);
			applyHistory(parsed);
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
							runs offline
						</Badge>
						{history ? (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => {
									setHistory(null);
									setRange(null);
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
						<DropZone
							onFiles={handleFiles}
							onDemo={() => applyHistory(createDemoHistory())}
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
									title: "3. Export CSV",
									body: "Fix up the odd day in the table, then download a file with Datum + Kantoor/Thuis that HR can paste into AFAS.",
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
					</>
				) : (
					<>
						<Card className="p-4">
							<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
								<div className="flex items-center gap-2">
									<span className="text-slate-500 dark:text-slate-400">
										Loaded
									</span>
									<Badge tone="muted">{history.files.length} file(s)</Badge>
								</div>
								<div className="flex items-center gap-2">
									<Badge tone="info">
										{totalVisits.toLocaleString()} visits
									</Badge>
									<Badge tone="info">
										{totalPoints.toLocaleString()} points
									</Badge>
								</div>
								{history.range ? (
									<span className="text-slate-600 dark:text-slate-300">
										{formatDate(bounds?.min ?? "", "dmy")} –{" "}
										{formatDate(bounds?.max ?? "", "dmy")}
									</span>
								) : null}
								{history.warnings.length > 0 ? (
									<button
										type="button"
										onClick={() => setShowDetails((value) => !value)}
										className="ml-auto text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
									>
										{history.warnings.length} warning(s)
									</button>
								) : null}
							</div>
							{showDetails ? (
								<div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
									{history.files.map((file) => (
										<p key={file.name} className="font-mono">
											{file.name} · {file.format} · {file.visits} visits ·{" "}
											{file.points} points
											{file.error ? ` · ${file.error}` : ""}
										</p>
									))}
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

						<DropZone
							onFiles={handleFiles}
							onDemo={() => applyHistory(createDemoHistory())}
							busy={busy}
							progress={progress}
							error={error}
							hasHistory
						/>
						{import.meta.env.DEV ? (
							<LocalDataPanel
								onFile={(file) => handleFiles([file])}
								disabled={busy}
							/>
						) : null}

						<PlaceSetup
							settings={settings}
							clusters={clusters}
							onChange={updateSettings}
						/>

						{bounds && range ? (
							<RangeControls
								settings={settings}
								range={range}
								bounds={bounds}
								onRangeChange={setRange}
								onSettingsChange={updateSettings}
							/>
						) : null}

						<div className="flex items-center gap-2">
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

				<p className="pb-8 pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
					Location history stays in this tab. Settings and manual day overrides
					are stored in localStorage on this device.
				</p>
			</main>
		</div>
	);
}
