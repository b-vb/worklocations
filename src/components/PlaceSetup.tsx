import { useEffect, useMemo, useState } from "react";
import { formatLatLng, type LatLng, parseCoordinateInput } from "../lib/geo";
import {
	type AddressResult,
	currentPosition,
	searchAddress,
} from "../lib/geocode";
import { useI18n } from "../lib/i18n";
import type { AppSettings } from "../lib/settings";
import { type PlaceCluster, suggestPlace } from "../lib/timeline/days";
import { PlaceMap } from "./PlaceMap";
import { Badge, Button, Card, Field, SectionHeader, TextInput } from "./ui";

type Props = {
	settings: AppSettings;
	clusters: PlaceCluster[];
	onChange: (patch: Partial<AppSettings>) => void;
	onContinue?: () => void;
};

export function PlaceSetup({
	settings,
	clusters,
	onChange,
	onContinue,
}: Props) {
	const { t } = useI18n();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<AddressResult[]>([]);
	const [searching, setSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [locating, setLocating] = useState(false);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [pickTarget, setPickTarget] = useState<"office" | "home">("office");
	const [editing, setEditing] = useState(false);

	const office = settings.office;
	const home = settings.home;

	const direct = useMemo(() => parseCoordinateInput(query), [query]);

	useEffect(() => {
		const trimmed = query.trim();
		setSearchError(null);
		if (trimmed.length < 3 || parseCoordinateInput(trimmed)) {
			setResults([]);
			return;
		}

		const controller = new AbortController();
		let cancelled = false;
		const timer = setTimeout(() => {
			setSearching(true);
			searchAddress(trimmed, controller.signal)
				.then((matches) => {
					if (cancelled) return;
					setResults(matches);
					if (matches.length === 0) {
						setSearchError(t("places.noAddress"));
					}
				})
				.catch((error: unknown) => {
					if (cancelled) return;
					if (error instanceof Error && error.name === "AbortError") return;
					setSearchError(
						error instanceof Error ? error.message : t("places.searchFailed"),
					);
				})
				.finally(() => {
					if (!cancelled) setSearching(false);
				});
		}, 400);

		return () => {
			cancelled = true;
			controller.abort();
			clearTimeout(timer);
		};
	}, [query, t]);

	const applyOffice = (lat: number, lng: number, label: string) => {
		onChange({
			office: {
				lat,
				lng,
				label,
				radiusMeters: office?.radiusMeters ?? 150,
			},
		});
		setQuery("");
		setResults([]);
	};

	const applyHome = (lat: number, lng: number, label: string) => {
		onChange({
			home: {
				lat,
				lng,
				label,
				radiusMeters: home?.radiusMeters ?? 120,
			},
		});
	};

	const useCurrentLocation = async () => {
		setLocating(true);
		setLocationError(null);
		try {
			const position = await currentPosition();
			applyOffice(position.lat, position.lng, t("places.currentLocation"));
		} catch (error) {
			setLocationError(
				error instanceof Error ? error.message : t("places.geoFailed"),
			);
		} finally {
			setLocating(false);
		}
	};

	const suggestedWork = suggestPlace(clusters, "WORK");
	const suggestedHome = suggestPlace(clusters, "HOME", home);

	const handleMapPick = (point: LatLng) => {
		if (pickTarget === "home") {
			applyHome(point.lat, point.lng, home?.label ?? t("places.pinned"));
			return;
		}
		applyOffice(point.lat, point.lng, office?.label ?? t("places.pinned"));
	};

	const workSuggestion =
		suggestedWork?.label === "WORK" ? suggestedWork : undefined;

	if (!editing) {
		return (
			<Card>
				<SectionHeader
					step="2"
					title={t("places.title")}
					description={t("places.description")}
					action={
						<Button
							size="sm"
							variant="secondary"
							onClick={() => setEditing(true)}
						>
							{t("places.editOnMap")}
						</Button>
					}
				/>

				<div className="grid gap-3 p-5 md:grid-cols-2">
					<div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
								{t("places.office")}
							</span>
							{office ? (
								<Badge tone="office">{t("places.set")}</Badge>
							) : (
								<Badge tone="other">{t("places.needed")}</Badge>
							)}
						</div>
						{office ? (
							<>
								<p className="mt-2 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
									{office.label || t("places.pinned")}
								</p>
								<p className="text-[11px] text-slate-500 dark:text-slate-400">
									{t("places.radius", { radius: office.radiusMeters })}
								</p>
								<Button
									size="sm"
									variant="ghost"
									className="mt-2 -ml-2"
									onClick={() => setEditing(true)}
								>
									{t("places.change")}
								</Button>
							</>
						) : (
							<>
								<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
									{t("places.officeHint")}
								</p>
								<div className="mt-2 flex flex-wrap gap-2">
									{workSuggestion ? (
										<Button
											size="sm"
											variant="primary"
											onClick={() =>
												applyOffice(
													workSuggestion.lat,
													workSuggestion.lng,
													t("places.workFromGoogle"),
												)
											}
										>
											{t("places.useWork")}
										</Button>
									) : null}
									<Button
										size="sm"
										variant="secondary"
										onClick={() => setEditing(true)}
									>
										{t("places.pickOnMap")}
									</Button>
								</div>
							</>
						)}
					</div>

					<div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
								{t("places.home")}
							</span>
							{home ? (
								<Badge tone="home">{t("places.set")}</Badge>
							) : (
								<Badge tone="muted">{t("places.auto")}</Badge>
							)}
						</div>
						{home ? (
							<>
								<p className="mt-2 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
									{home.label || t("places.pinned")}
								</p>
								<p className="text-[11px] text-slate-500 dark:text-slate-400">
									{t("places.radius", { radius: home.radiusMeters })}
								</p>
								<Button
									size="sm"
									variant="ghost"
									className="mt-2 -ml-2"
									onClick={() => setEditing(true)}
								>
									{t("places.change")}
								</Button>
							</>
						) : (
							<>
								<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
									{t("places.homeHint")}
								</p>
								<div className="mt-2 flex flex-wrap gap-2">
									{suggestedHome ? (
										<Button
											size="sm"
											variant="secondary"
											onClick={() =>
												applyHome(
													suggestedHome.lat,
													suggestedHome.lng,
													t("places.homeFromGoogle"),
												)
											}
										>
											{t("places.useHome")}
										</Button>
									) : null}
									<Button
										size="sm"
										variant="ghost"
										onClick={() => setEditing(true)}
									>
										{t("places.pickOnMap")}
									</Button>
								</div>
							</>
						)}
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
					<p className="text-xs text-slate-500 dark:text-slate-400">
						{office ? t("places.footerSaved") : t("places.footerNeeded")}
					</p>
					{office && onContinue ? (
						<Button variant="primary" size="sm" onClick={onContinue}>
							{t("places.next")}
						</Button>
					) : null}
				</div>
			</Card>
		);
	}

	return (
		<Card>
			<SectionHeader
				step="2"
				title={t("places.editorTitle")}
				description={t("places.editorDescription")}
				action={
					<div className="flex items-center gap-2">
						{workSuggestion ? (
							<Badge tone="info">{t("places.workFound")}</Badge>
						) : null}
						<Button
							size="sm"
							variant="secondary"
							onClick={() => setEditing(false)}
						>
							{t("places.done")}
						</Button>
					</div>
				}
			/>

			<div className="px-5 pt-5">
				<PlaceMap
					office={office}
					home={home}
					pickTarget={pickTarget}
					onPickTargetChange={setPickTarget}
					onPick={handleMapPick}
					onMoveOffice={(point) => {
						if (office) onChange({ office: { ...office, ...point } });
					}}
					onMoveHome={(point) => {
						if (home) onChange({ home: { ...home, ...point } });
					}}
				/>
			</div>

			<div className="grid gap-6 px-5 pb-5 pt-4 lg:grid-cols-2">
				<div className="space-y-4">
					<Field
						label={t("places.addressLabel")}
						hint={t("places.addressHint")}
					>
						<TextInput
							value={query}
							aria-label={t("places.addressLabel")}
							placeholder={t("places.addressPlaceholder")}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</Field>

					{direct ? (
						<Button
							variant="primary"
							size="sm"
							onClick={() =>
								applyOffice(direct.lat, direct.lng, formatLatLng(direct))
							}
						>
							{t("places.useCoords", { coords: formatLatLng(direct, 4) })}
						</Button>
					) : null}

					{searching ? (
						<p className="text-xs text-slate-500 dark:text-slate-400">
							{t("places.searching")}
						</p>
					) : null}

					{searchError ? (
						<p className="text-xs text-rose-600 dark:text-rose-400">
							{searchError}
						</p>
					) : null}

					{results.length > 0 ? (
						<ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
							{results.map((result) => (
								<li key={`${result.label}-${result.lat}-${result.lng}`}>
									<button
										type="button"
										onClick={() =>
											applyOffice(result.lat, result.lng, result.label)
										}
										className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
									>
										<span className="block font-medium text-slate-800 dark:text-slate-100">
											{result.label}
										</span>
										<span className="block font-mono text-[11px] text-slate-400">
											{formatLatLng(result)}
										</span>
									</button>
								</li>
							))}
						</ul>
					) : null}

					<div className="flex flex-wrap gap-2">
						<Button size="sm" onClick={useCurrentLocation} disabled={locating}>
							{locating ? t("places.locating") : t("places.useCurrent")}
						</Button>
						{office ? (
							<Button
								size="sm"
								variant="danger"
								onClick={() => onChange({ office: null })}
							>
								{t("places.clearOffice")}
							</Button>
						) : null}
					</div>
					{locationError ? (
						<p className="text-xs text-rose-600 dark:text-rose-400">
							{locationError}
						</p>
					) : null}

					{office ? (
						<div className="rounded-xl bg-indigo-50/70 p-3 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/20">
							<div className="flex items-center justify-between gap-2">
								<div>
									<p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
										{office.label || t("places.office")}
									</p>
									<p className="font-mono text-[11px] text-indigo-700/70 dark:text-indigo-300/70">
										{formatLatLng(office)}
									</p>
								</div>
								<Badge tone="office">{t("places.officeBadge")}</Badge>
							</div>
							<RadiusSlider
								radius={office.radiusMeters}
								onChange={(radiusMeters) =>
									onChange({ office: { ...office, radiusMeters } })
								}
							/>
						</div>
					) : (
						<div className="rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
							<p className="text-xs text-slate-500 dark:text-slate-400">
								{t("places.officeEmpty")}
							</p>
							{suggestedWork ? (
								<Button
									size="sm"
									variant="primary"
									className="mt-2"
									onClick={() =>
										applyOffice(
											suggestedWork.lat,
											suggestedWork.lng,
											suggestedWork.label === "WORK"
												? t("places.workFromGoogle")
												: t("places.mostVisited"),
										)
									}
								>
									{suggestedWork.label === "WORK"
										? t("places.useWork")
										: t("places.useMostVisited")}
								</Button>
							) : null}
						</div>
					)}

					<div className="rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
						<div className="flex items-center justify-between gap-2">
							<div>
								<p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
									{home?.label ?? t("places.homeAuto")}
								</p>
								<p className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70">
									{home ? formatLatLng(home) : t("places.homeAutoHint")}
								</p>
							</div>
							<div className="flex items-center gap-2">
								{suggestedHome ? (
									<Button
										size="sm"
										onClick={() =>
											applyHome(
												suggestedHome.lat,
												suggestedHome.lng,
												suggestedHome.label ?? t("places.home"),
											)
										}
									>
										{t("places.useSuggested")}
									</Button>
								) : null}
								{home ? (
									<Button
										size="sm"
										variant="ghost"
										onClick={() => onChange({ home: null })}
									>
										{t("places.autoHome")}
									</Button>
								) : null}
							</div>
						</div>
						{home ? (
							<RadiusSlider
								radius={home.radiusMeters}
								onChange={(radiusMeters) =>
									onChange({ home: { ...home, radiusMeters } })
								}
							/>
						) : null}
					</div>
				</div>

				<div>
					<p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
						{t("places.frequent")}
					</p>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
						{t("places.frequentHint")}
					</p>
					<ul className="mt-3 space-y-2">
						{clusters.slice(0, 7).map((place) => {
							const isOffice =
								office &&
								Math.abs(office.lat - place.lat) < 1e-4 &&
								Math.abs(office.lng - place.lng) < 1e-4;
							const isHome =
								home &&
								Math.abs(home.lat - place.lat) < 1e-4 &&
								Math.abs(home.lng - place.lng) < 1e-4;
							return (
								<li
									key={`${place.lat}-${place.lng}`}
									className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
											{place.label === "WORK"
												? t("places.work")
												: place.label === "HOME"
													? t("places.home")
													: t("places.frequentPlace")}
											<span className="ml-2 font-mono text-[11px] font-normal text-slate-400">
												{formatLatLng(place, 4)}
											</span>
										</p>
										<p className="text-[11px] text-slate-500 dark:text-slate-400">
											{t("places.frequentSummary", {
												hours: Math.round(place.minutes / 60),
												days: place.days,
											})}
										</p>
									</div>
									<div className="flex gap-1">
										{isOffice ? (
											<Badge tone="office">{t("places.officeBadge")}</Badge>
										) : (
											<Button
												size="sm"
												variant="ghost"
												onClick={() =>
													applyOffice(
														place.lat,
														place.lng,
														place.label ?? t("places.office"),
													)
												}
											>
												{t("places.office")}
											</Button>
										)}
										{isHome ? (
											<Badge tone="home">{t("places.homeBadge")}</Badge>
										) : (
											<Button
												size="sm"
												variant="ghost"
												onClick={() =>
													applyHome(
														place.lat,
														place.lng,
														place.label ?? t("places.home"),
													)
												}
											>
												{t("places.home")}
											</Button>
										)}
									</div>
								</li>
							);
						})}
						{clusters.length === 0 ? (
							<li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
								{t("places.noPlaces")}
							</li>
						) : null}
					</ul>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
				<p className="text-xs text-slate-500 dark:text-slate-400">
					{office ? t("places.footerSaved") : t("places.footerNeeded")}
				</p>
				{office && onContinue ? (
					<Button variant="primary" size="sm" onClick={onContinue}>
						{t("places.next")}
					</Button>
				) : (
					<Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
						{t("places.back")}
					</Button>
				)}
			</div>
		</Card>
	);
}

function RadiusSlider({
	radius,
	onChange,
}: {
	radius: number;
	onChange: (radius: number) => void;
}) {
	const { t } = useI18n();
	return (
		<label className="mt-3 block">
			<span className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
				{t("places.radiusLabel")}
				<span className="font-mono tabular-nums">{radius} m</span>
			</span>
			<input
				type="range"
				min={50}
				max={800}
				step={10}
				value={radius}
				onChange={(event) => onChange(Number(event.target.value))}
				className="mt-1 w-full accent-slate-900 dark:accent-white"
			/>
		</label>
	);
}
