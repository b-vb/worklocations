import { useActor } from "@xstate/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatLatLng, type LatLng, parseCoordinateInput } from "../lib/geo";
import { useI18n } from "../lib/i18n";
import type { AppSettings } from "../lib/settings";
import { type PlaceCluster, suggestPlace } from "../lib/timeline/days";
import { placesMachine } from "../machines/placesMachine";
import { PlaceMap } from "./PlaceMap";
import { PlacePreviewMap } from "./PlacePreviewMap";
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
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const [placesSnapshot, placesSend] = useActor(placesMachine, {
		input: {
			office: settings.office,
			home: settings.home,
			onOffice: (place) => onChangeRef.current({ office: place }),
			onHome: (place) => onChangeRef.current({ home: place }),
		},
	});

	useEffect(() => {
		placesSend({
			type: "SYNC",
			office: settings.office,
			home: settings.home,
		});
	}, [placesSend, settings.office, settings.home]);

	const office = placesSnapshot.context.office;
	const home = placesSnapshot.context.home;
	const editing = placesSnapshot.matches("editing");
	const query = placesSnapshot.context.query;
	const results = placesSnapshot.context.results;
	const pickTarget = placesSnapshot.context.pickTarget;
	const searching = placesSnapshot.matches({
		editing: { search: "searching" },
	});
	const locating = placesSnapshot.matches({
		editing: { locate: "locating" },
	});
	const emptySearch = placesSnapshot.matches({
		editing: { search: "empty" },
	});
	const searchError = emptySearch
		? t("places.noAddress")
		: placesSnapshot.context.searchError;
	const locationError = placesSnapshot.context.locateError;
	const [previewPlace, setPreviewPlace] = useState<PlaceCluster | null>(null);

	const direct = useMemo(() => parseCoordinateInput(query), [query]);

	const applyOffice = (lat: number, lng: number, label: string) => {
		placesSend({
			type: "SET_OFFICE",
			place: {
				lat,
				lng,
				label,
				radiusMeters: office?.radiusMeters ?? 150,
			},
		});
	};

	const applyHome = (lat: number, lng: number, label: string) => {
		placesSend({
			type: "SET_HOME",
			place: {
				lat,
				lng,
				label,
				radiusMeters: home?.radiusMeters ?? 120,
			},
		});
	};

	const locateCurrentPosition = () => {
		placesSend({ type: "LOCATE", label: t("places.currentLocation") });
	};

	const suggestedWork = suggestPlace(clusters, "WORK");
	const suggestedHome = suggestPlace(clusters, "HOME", home);

	const placeLabel = (place: PlaceCluster) =>
		place.label === "WORK"
			? t("places.workFromGoogle")
			: place.label === "HOME"
				? t("places.homeFromGoogle")
				: t("places.frequentPlace");

	const handleMapPick = (point: LatLng) => {
		const label =
			pickTarget === "home"
				? (home?.label ?? t("places.pinned"))
				: (office?.label ?? t("places.pinned"));
		if (pickTarget === "home") {
			applyHome(point.lat, point.lng, label);
		} else {
			applyOffice(point.lat, point.lng, label);
		}
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
							onClick={() => placesSend({ type: "OPEN_EDITOR" })}
						>
							{t("places.editOnMap")}
						</Button>
					}
				/>

				<div className="grid gap-3 p-5 md:grid-cols-2">
					<div className="rounded-2xl border-2 border-sky/40 bg-sky/10 p-3 dark:border-sky/20 dark:bg-sky/5">
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
									onClick={() => placesSend({ type: "OPEN_EDITOR" })}
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
										onClick={() => placesSend({ type: "OPEN_EDITOR" })}
									>
										{t("places.pickOnMap")}
									</Button>
								</div>
							</>
						)}
					</div>

					<div className="rounded-2xl border-2 border-mint/50 bg-mint/10 p-3 dark:border-mint/20 dark:bg-mint/5">
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
									onClick={() => placesSend({ type: "OPEN_EDITOR" })}
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
										onClick={() => placesSend({ type: "OPEN_EDITOR" })}
									>
										{t("places.pickOnMap")}
									</Button>
								</div>
							</>
						)}
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/8 px-5 py-3 dark:border-white/10">
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
		<>
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
								onClick={() => placesSend({ type: "CLOSE_EDITOR" })}
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
						onPickTargetChange={(target) =>
							placesSend({ type: "SET_PICK_TARGET", target })
						}
						onPick={handleMapPick}
						onMoveOffice={(point) => {
							if (office)
								placesSend({
									type: "SET_OFFICE",
									place: { ...office, ...point },
								});
						}}
						onMoveHome={(point) => {
							if (home)
								placesSend({
									type: "SET_HOME",
									place: { ...home, ...point },
								});
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
								onChange={(event) =>
									placesSend({
										type: "QUERY_CHANGED",
										query: event.target.value,
									})
								}
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
							<ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border-2 border-ink/10 dark:divide-white/10 dark:border-white/10">
								{results.map((result) => (
									<li key={`${result.label}-${result.lat}-${result.lng}`}>
										<button
											type="button"
											onClick={() =>
												applyOffice(result.lat, result.lng, result.label)
											}
											className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-sun/20 dark:hover:bg-white/5"
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
							<Button
								size="sm"
								onClick={locateCurrentPosition}
								disabled={locating}
							>
								{locating ? t("places.locating") : t("places.useCurrent")}
							</Button>
							{office ? (
								<Button
									size="sm"
									variant="danger"
									onClick={() => placesSend({ type: "CLEAR_OFFICE" })}
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
							<div className="rounded-2xl border-2 border-sky/40 bg-sky/15 p-3 dark:border-sky/20 dark:bg-sky/10">
								<div className="flex items-center justify-between gap-2">
									<div>
										<p className="text-sm font-extrabold text-ink dark:text-white">
											{office.label || t("places.office")}
										</p>
										<p className="font-mono text-[11px] text-ink/50 dark:text-white/50">
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
							<div className="rounded-2xl border-2 border-dashed border-ink/20 p-3 dark:border-white/15">
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

						<div className="rounded-2xl border-2 border-mint/50 bg-mint/15 p-3 dark:border-mint/20 dark:bg-mint/10">
							<div className="flex items-center justify-between gap-2">
								<div>
									<p className="text-sm font-extrabold text-ink dark:text-white">
										{home?.label ?? t("places.homeAuto")}
									</p>
									<p className="text-[11px] text-ink/50 dark:text-white/50">
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
											onClick={() => placesSend({ type: "CLEAR_HOME" })}
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
										className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-ink/8 px-3 py-2 dark:border-white/10"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-extrabold text-ink dark:text-white">
												{place.label === "WORK"
													? t("places.work")
													: place.label === "HOME"
														? t("places.home")
														: t("places.frequentPlace")}
												<span className="ml-2 font-mono text-[11px] font-normal text-ink/40 dark:text-white/40">
													{formatLatLng(place, 4)}
												</span>
											</p>
											<p className="text-[11px] font-medium text-ink/50 dark:text-white/50">
												{t("places.frequentSummary", {
													hours: Math.round(place.minutes / 60),
													days: place.days,
												})}
											</p>
										</div>
										<div className="flex flex-wrap items-center justify-end gap-1">
											<Button
												size="sm"
												variant="secondary"
												onClick={() => setPreviewPlace(place)}
											>
												<span aria-hidden="true">🗺️</span>
												{t("places.showMap")}
											</Button>
											{isOffice ? (
												<Badge tone="office">{t("places.officeBadge")}</Badge>
											) : (
												<Button
													size="sm"
													variant="ghost"
													onClick={() =>
														applyOffice(place.lat, place.lng, placeLabel(place))
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
														applyHome(place.lat, place.lng, placeLabel(place))
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
								<li className="rounded-xl border-2 border-dashed border-ink/20 px-3 py-4 text-xs font-medium text-ink/50 dark:border-white/15 dark:text-white/50">
									{t("places.noPlaces")}
								</li>
							) : null}
						</ul>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/8 px-5 py-3 dark:border-white/10">
					<p className="text-xs text-slate-500 dark:text-slate-400">
						{office ? t("places.footerSaved") : t("places.footerNeeded")}
					</p>
					{office && onContinue ? (
						<Button variant="primary" size="sm" onClick={onContinue}>
							{t("places.next")}
						</Button>
					) : (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => placesSend({ type: "CLOSE_EDITOR" })}
						>
							{t("places.back")}
						</Button>
					)}
				</div>
			</Card>
			{previewPlace ? (
				<PlacePreviewMap
					place={previewPlace}
					onClose={() => setPreviewPlace(null)}
					onSetOffice={() => {
						applyOffice(
							previewPlace.lat,
							previewPlace.lng,
							placeLabel(previewPlace),
						);
						setPreviewPlace(null);
					}}
					onSetHome={() => {
						applyHome(
							previewPlace.lat,
							previewPlace.lng,
							placeLabel(previewPlace),
						);
						setPreviewPlace(null);
					}}
				/>
			) : null}
		</>
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
				className="mt-1 w-full accent-coral"
			/>
		</label>
	);
}
