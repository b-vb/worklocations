import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useActor } from "@xstate/react";
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
import { useI18n } from "../lib/i18n";
import type { PlaceSetting } from "../lib/settings";
import { TILE_ATTRIBUTION, TILE_PROVIDERS } from "../lib/tiles";
import type { PickTarget } from "../machines/placesMachine";
import { tileProviderMachine } from "../machines/tileProviderMachine";
import { Button, cn } from "./ui";

const OFFICE_COLOR = "#4f46e5";
const HOME_COLOR = "#059669";
const FALLBACK_CENTER: L.LatLngExpression = [52.1326, 5.2913];

type Props = {
	office: PlaceSetting | null;
	home: PlaceSetting | null;
	pickTarget: PickTarget;
	onPickTargetChange: (target: PickTarget) => void;
	onPick: (point: LatLng) => void;
	onMoveOffice: (point: LatLng) => void;
	onMoveHome: (point: LatLng) => void;
};

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

function fitToPoints(map: L.Map, points: LatLng[]) {
	const first = points[0];
	const second = points[1];
	if (!first) {
		map.setView(FALLBACK_CENTER, 7);
		return;
	}
	if (!second) {
		map.setView([first.lat, first.lng], 15);
		return;
	}
	map.fitBounds(
		L.latLngBounds([
			[first.lat, first.lng],
			[second.lat, second.lng],
		]).pad(0.45),
		{ maxZoom: 15 },
	);
}

function FitToPlaces({ points }: { points: LatLng[] }) {
	const map = useMap();

	useEffect(() => {
		fitToPoints(map, points);
	}, [map, points]);

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
	const { t } = useI18n();
	const [map, setMap] = useState<L.Map | null>(null);
	const [tileSnapshot, tilesSend] = useActor(tileProviderMachine);
	const providerIndex = tileSnapshot.matches("primary") ? 0 : 1;
	const tilesFailed = tileSnapshot.matches("failed");
	const providerUrl = TILE_PROVIDERS[providerIndex];

	const handleTileError = () => tilesSend({ type: "TILE_ERROR" });
	const handleTileLoad = () => tilesSend({ type: "TILE_LOAD" });

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
		<div className="relative isolate z-0 overflow-hidden rounded-[26px] border-2 border-ink/10 dark:border-white/10">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-xs font-semibold text-ink/70 dark:text-white/70">
						{t("map.clickToSet")}
					</span>
					<div className="flex rounded-full border-2 border-ink/15 bg-white p-0.5 dark:border-white/15 dark:bg-white/10">
						{(
							[
								["office", t("map.office")],
								["home", t("map.home")],
							] as const
						).map(([value, label]) => (
							<button
								key={value}
								type="button"
								onClick={() => onPickTargetChange(value)}
								className={cn(
									"rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors",
									pickTarget === value
										? value === "office"
											? "bg-sky text-ink"
											: "bg-mint text-ink"
										: "text-ink/65 hover:bg-sun/25 dark:text-white/65 dark:hover:bg-white/15",
								)}
								aria-pressed={pickTarget === value}
							>
								{label}
							</button>
						))}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="hidden text-[11px] font-medium text-ink/55 dark:text-white/55 sm:inline">
						{t("map.dragHint")}
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
						{t("map.recenter")}
					</Button>
				</div>
			</div>

			<div className="relative">
				<MapContainer
					ref={setMap}
					center={center}
					zoom={office || home ? 14 : 7}
					scrollWheelZoom={false}
					className="h-[300px] w-full"
					attributionControl={true}
				>
					<TileLayer
						key={providerUrl}
						url={providerUrl}
						attribution={TILE_ATTRIBUTION}
						maxZoom={19}
						eventHandlers={{
							tileerror: handleTileError,
							load: handleTileLoad,
						}}
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

				{tilesFailed ? (
					<div className="pointer-events-none absolute inset-x-3 bottom-8 z-[500] rounded-lg bg-sun/90 px-3 py-2 text-[11px] font-semibold text-ink shadow ring-1 ring-sun dark:bg-sun/20 dark:text-white dark:ring-sun/30">
						{t("map.tilesFailed")}
					</div>
				) : null}
			</div>
		</div>
	);
}
