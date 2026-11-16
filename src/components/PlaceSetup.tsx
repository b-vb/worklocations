import { useEffect, useMemo, useState } from "react";
import { formatLatLng, type LatLng, parseCoordinateInput } from "../lib/geo";
import {
	type AddressResult,
	currentPosition,
	searchAddress,
} from "../lib/geocode";
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
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<AddressResult[]>([]);
	const [searching, setSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [locating, setLocating] = useState(false);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [pickTarget, setPickTarget] = useState<"office" | "home">("office");

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
						setSearchError("No address found. Try a street name and city.");
					}
				})
				.catch((error: unknown) => {
					if (cancelled) return;
					if (error instanceof Error && error.name === "AbortError") return;
					setSearchError(
						error instanceof Error ? error.message : "Address lookup failed.",
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
	}, [query]);

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
			applyOffice(position.lat, position.lng, "Current location");
		} catch (error) {
			setLocationError(
				error instanceof Error ? error.message : "Could not get your location.",
			);
		} finally {
			setLocating(false);
		}
	};

	const suggestedWork = suggestPlace(clusters, "WORK");
	const suggestedHome = suggestPlace(clusters, "HOME", home);

	const handleMapPick = (point: LatLng) => {
		if (pickTarget === "home") {
			applyHome(point.lat, point.lng, home?.label ?? "Picked on map");
			return;
		}
		applyOffice(point.lat, point.lng, office?.label ?? "Picked on map");
	};

	return (
		<Card>
			<SectionHeader
				step="2"
				title="Where is the office?"
				description="Click the map or drag the pins. Every minute inside a radius counts as time at that place."
				action={
					<Badge tone="info">
						{suggestedWork?.label === "WORK"
							? "Google labelled WORK found"
							: "Street lookup by OSM"}
					</Badge>
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
				<p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
					Map data from OpenStreetMap, no key needed. Tiles load only while this
					map is visible; your location history is never sent to them.
				</p>
			</div>

			<div className="grid gap-6 px-5 pb-5 pt-4 lg:grid-cols-2">
				<div className="space-y-4">
					<Field
						label="Office address, coordinates, or Google Maps link"
						hint="Address lookups go to OpenStreetMap's Photon service. Nothing else leaves your browser."
					>
						<TextInput
							value={query}
							aria-label="Office address, coordinates or Google Maps link"
							placeholder="e.g. Barbara Strozzilaan 201, Amsterdam"
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
							Use coordinates {formatLatLng(direct, 4)}
						</Button>
					) : null}

					{searching ? (
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Searching…
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
							{locating ? "Locating…" : "Use my current location"}
						</Button>
						{office ? (
							<Button
								size="sm"
								variant="danger"
								onClick={() => onChange({ office: null })}
							>
								Clear office
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
										{office.label || "Office"}
									</p>
									<p className="font-mono text-[11px] text-indigo-700/70 dark:text-indigo-300/70">
										{formatLatLng(office)}
									</p>
								</div>
								<Badge tone="office">office</Badge>
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
								No office set yet. Until then, places Google labels{" "}
								<code className="font-mono">WORK</code> are treated as office.
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
												? "Work (from Google)"
												: "Most visited place",
										)
									}
								>
									{suggestedWork.label === "WORK"
										? "Use Google's WORK place"
										: "Use most visited place"}
								</Button>
							) : null}
						</div>
					)}

					<div className="rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
						<div className="flex items-center justify-between gap-2">
							<div>
								<p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
									{home?.label ?? "Home — auto"}
								</p>
								<p className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70">
									{home
										? formatLatLng(home)
										: "Using Google's HOME label. Pin it for sharper results."}
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
												suggestedHome.label ?? "Suggested home",
											)
										}
									>
										Use suggested
									</Button>
								) : null}
								{home ? (
									<Button
										size="sm"
										variant="ghost"
										onClick={() => onChange({ home: null })}
									>
										Auto
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
						Places you spend time
					</p>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
						Based on your own history. One click to pin office or home.
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
												? "Work"
												: place.label === "HOME"
													? "Home"
													: "Frequent place"}
											<span className="ml-2 font-mono text-[11px] font-normal text-slate-400">
												{formatLatLng(place, 4)}
											</span>
										</p>
										<p className="text-[11px] text-slate-500 dark:text-slate-400">
											{Math.round(place.minutes / 60)}h total · {place.days}{" "}
											days
										</p>
									</div>
									<div className="flex gap-1">
										{isOffice ? (
											<Badge tone="office">office</Badge>
										) : (
											<Button
												size="sm"
												variant="ghost"
												onClick={() =>
													applyOffice(
														place.lat,
														place.lng,
														place.label ?? "Office",
													)
												}
											>
												Office
											</Button>
										)}
										{isHome ? (
											<Badge tone="home">home</Badge>
										) : (
											<Button
												size="sm"
												variant="ghost"
												onClick={() =>
													applyHome(place.lat, place.lng, place.label ?? "Home")
												}
											>
												Home
											</Button>
										)}
									</div>
								</li>
							);
						})}
						{clusters.length === 0 ? (
							<li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
								No places found yet.
							</li>
						) : null}
					</ul>
				</div>
			</div>

			{onContinue ? (
				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
					<p className="text-xs text-slate-500 dark:text-slate-400">
						These settings are saved in this browser, so you only have to do
						this once.
					</p>
					<Button variant="primary" size="sm" onClick={onContinue}>
						Next: choose the period
					</Button>
				</div>
			) : null}
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
	return (
		<label className="mt-3 block">
			<span className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
				Radius
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
