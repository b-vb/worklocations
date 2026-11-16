import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import {
	Circle,
	MapContainer,
	Marker,
	TileLayer,
	useMap,
	useMapEvents,
} from "react-leaflet";
import type { LatLng } from "../lib/geo";
import type { PlaceSetting } from "../lib/settings";
import { Button, cn } from "./ui";

const OFFICE_COLOR = "#4f46e5";
const HOME_COLOR = "#059669";
const FALLBACK_CENTER: L.LatLngExpression = [52.1326, 5.2913];

type PickTarget = "office" | "home";

type Props = {
	office: PlaceSetting | null;
	home: PlaceSetting | null;
	pickTarget: PickTarget;
	onPickTargetChange: (target: PickTarget) => void;
	onPick: (point: LatLng) => void;
	onMoveOffice: (point: LatLng) => void;
	onMoveHome: (point: LatLng) => void;
};

function usePrefersDark(): boolean {
	const [dark, setDark] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches,
	);

	useEffect(() => {
		const query = window.matchMedia("(prefers-color-scheme: dark)");
		const update = () => setDark(query.matches);
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);

	return dark;
}

function dotIcon(color: string, label: string): L.DivIcon {
	return L.divIcon({
		className: "commute-map-pin",
		html: `<span style="
			display:flex;align-items:center;justify-content:center;
			width:26px;height:26px;border-radius:9999px;
			background:${color};color:#fff;font:600 10px/1 ui-sans-serif,system-ui;
			border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.45);
			letter-spacing:.02em;
		">${label}</span>`,
		iconSize: [26, 26],
		iconAnchor: [13, 13],
	});
}

function ClickToPick({ onPick }: { onPick: (point: LatLng) => void }) {
	useMapEvents({
		click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }),
	});
	return null;
}

function FitToPlaces({ points }: { points: LatLng[] }) {
	const map = useMap();
	const first = points[0] ?? null;
	const second = points[1] ?? null;
	const firstLat = first?.lat ?? null;
	const firstLng = first?.lng ?? null;
	const secondLat = second?.lat ?? null;
	const secondLng = second?.lng ?? null;

	useEffect(() => {
		if (firstLat === null || firstLng === null) return;
		if (secondLat === null || secondLng === null) {
			map.setView([firstLat, firstLng], 15);
			return;
		}
		map.fitBounds(
			L.latLngBounds([
				[firstLat, firstLng],
				[secondLat, secondLng],
			]).pad(0.45),
			{ maxZoom: 15 },
		);
	}, [map, firstLat, firstLng, secondLat, secondLng]);

	return null;
}

export function PlaceMap({
	office,
	home,
	pickTarget,
	onPickTargetChange,
	onPick,
	onMoveOffice,
	onMoveHome,
}: Props) {
	const dark = usePrefersDark();
	const [map, setMap] = useState<L.Map | null>(null);

	const officeIcon = useMemo(() => dotIcon(OFFICE_COLOR, "O"), []);
	const homeIcon = useMemo(() => dotIcon(HOME_COLOR, "H"), []);

	const points = useMemo(
		() =>
			[office, home]
				.filter((place): place is PlaceSetting => place !== null)
				.map((place) => ({ lat: place.lat, lng: place.lng })),
		[office, home],
	);

	const center: L.LatLngExpression = office
		? [office.lat, office.lng]
		: home
			? [home.lat, home.lng]
			: FALLBACK_CENTER;

	return (
		<div className="relative isolate z-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
			<div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
				<div className="flex items-center gap-2">
					<span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
						Click the map to set
					</span>
					<div className="flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
						{(
							[
								["office", "Office"],
								["home", "Home"],
							] as const
						).map(([value, label]) => (
							<button
								key={value}
								type="button"
								onClick={() => onPickTargetChange(value)}
								className={cn(
									"rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
									pickTarget === value
										? value === "office"
											? "bg-indigo-600 text-white"
											: "bg-emerald-600 text-white"
										: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
								)}
								aria-pressed={pickTarget === value}
							>
								{label}
							</button>
						))}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="hidden text-[11px] text-slate-400 dark:text-slate-500 sm:inline">
						Drag a pin to fine-tune
					</span>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => {
							if (!map) return;
							if (points.length === 0) map.setView(FALLBACK_CENTER, 7);
							else if (points.length === 1)
								map.setView([points[0].lat, points[0].lng], 15);
							else
								map.fitBounds(
									L.latLngBounds(
										points.map((point) => [point.lat, point.lng]),
									).pad(0.45),
									{ maxZoom: 15 },
								);
						}}
					>
						Recenter
					</Button>
				</div>
			</div>

			<MapContainer
				ref={setMap}
				center={center}
				zoom={office || home ? 14 : 7}
				scrollWheelZoom={false}
				className="h-[300px] w-full"
				attributionControl={true}
			>
				<TileLayer
					url={
						dark
							? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
							: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
					}
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
					subdomains="abcd"
					maxZoom={20}
				/>

				{office ? (
					<>
						<Circle
							center={[office.lat, office.lng]}
							radius={office.radiusMeters}
							pathOptions={{
								color: OFFICE_COLOR,
								fillColor: OFFICE_COLOR,
								fillOpacity: 0.14,
								weight: 1.5,
							}}
						/>
						<Marker
							position={[office.lat, office.lng]}
							icon={officeIcon}
							draggable
							eventHandlers={{
								dragend: (event) => {
									const latlng = (event.target as L.Marker).getLatLng();
									onMoveOffice({ lat: latlng.lat, lng: latlng.lng });
								},
							}}
						/>
					</>
				) : null}

				{home ? (
					<>
						<Circle
							center={[home.lat, home.lng]}
							radius={home.radiusMeters}
							pathOptions={{
								color: HOME_COLOR,
								fillColor: HOME_COLOR,
								fillOpacity: 0.14,
								weight: 1.5,
							}}
						/>
						<Marker
							position={[home.lat, home.lng]}
							icon={homeIcon}
							draggable
							eventHandlers={{
								dragend: (event) => {
									const latlng = (event.target as L.Marker).getLatLng();
									onMoveHome({ lat: latlng.lat, lng: latlng.lng });
								},
							}}
						/>
					</>
				) : null}

				<ClickToPick onPick={onPick} />
				<FitToPlaces points={points} />
			</MapContainer>
		</div>
	);
}
