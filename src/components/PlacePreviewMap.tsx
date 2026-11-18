import { useActor } from "@xstate/react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";
import { formatLatLng } from "../lib/geo";
import { useI18n } from "../lib/i18n";
import { TILE_ATTRIBUTION, TILE_PROVIDERS } from "../lib/tiles";
import type { PlaceCluster } from "../lib/timeline/days";
import { tileProviderMachine } from "../machines/tileProviderMachine";
import { Button } from "./ui";

const PREVIEW_COLOR = "#ff6b6b";
const PREVIEW_RADIUS = 120;

function previewIcon(): L.DivIcon {
	return L.divIcon({
		className: "commute-map-pin",
		html: `<span style="
			display:flex;align-items:center;justify-content:center;
			width:30px;height:30px;border-radius:9999px;
			background:${PREVIEW_COLOR};border:3px solid #fff;
			box-shadow:0 2px 8px rgba(34,48,57,.45);
		"><span style="
			width:9px;height:9px;border-radius:9999px;background:#fff;
		"></span></span>`,
		iconSize: [30, 30],
		iconAnchor: [15, 15],
	});
}

type Props = {
	place: PlaceCluster;
	onClose: () => void;
	onSetOffice: () => void;
	onSetHome: () => void;
};

export function PlacePreviewMap({
	place,
	onClose,
	onSetOffice,
	onSetHome,
}: Props) {
	const { t } = useI18n();
	const [tileSnapshot, tilesSend] = useActor(tileProviderMachine);
	const tilesFailed = tileSnapshot.matches("failed");
	const providerUrl = TILE_PROVIDERS[tileSnapshot.matches("primary") ? 0 : 1];
	const icon = useMemo(previewIcon, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [onClose]);

	const name =
		place.label === "WORK"
			? t("places.work")
			: place.label === "HOME"
				? t("places.home")
				: t("places.frequentPlace");

	return (
		<div className="fixed inset-0 z-[2000] flex items-end justify-center p-3 sm:items-center">
			<button
				type="button"
				aria-label={t("places.close")}
				onClick={onClose}
				className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-sm"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={t("places.previewTitle")}
				className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[26px] border-2 border-ink/10 bg-paper shadow-[0_16px_50px_rgba(34,48,57,0.35)] dark:border-white/10 dark:bg-night-card"
			>
				<div className="flex items-start justify-between gap-3 px-4 pt-4">
					<div>
						<p className="text-[11px] font-black uppercase tracking-wider text-ink/45 dark:text-white/45">
							{name}
						</p>
						<h3 className="mt-0.5 text-lg font-extrabold text-ink dark:text-white">
							{t("places.previewTitle")}
						</h3>
						<p className="text-xs font-medium text-ink/55 dark:text-white/55">
							{t("places.previewHelp")}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label={t("places.close")}
						className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink/10 text-ink/55 transition-colors hover:bg-sun/30 hover:text-ink dark:border-white/15 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
					>
						✕
					</button>
				</div>

				<div className="relative mx-4 mt-3 overflow-hidden rounded-2xl border-2 border-ink/10 dark:border-white/10">
					<MapContainer
						center={[place.lat, place.lng]}
						zoom={16}
						scrollWheelZoom={false}
						className="h-[220px] w-full"
						attributionControl={true}
					>
						<TileLayer
							key={providerUrl}
							url={providerUrl}
							attribution={TILE_ATTRIBUTION}
							maxZoom={19}
							eventHandlers={{
								tileerror: () => tilesSend({ type: "TILE_ERROR" }),
								load: () => tilesSend({ type: "TILE_LOAD" }),
							}}
						/>
						<Circle
							center={[place.lat, place.lng]}
							radius={PREVIEW_RADIUS}
							pathOptions={{
								color: PREVIEW_COLOR,
								fillColor: PREVIEW_COLOR,
								fillOpacity: 0.16,
								weight: 2,
							}}
						/>
						<Marker position={[place.lat, place.lng]} icon={icon} />
					</MapContainer>
					{tilesFailed ? (
						<div className="pointer-events-none absolute inset-x-3 bottom-8 z-[500] rounded-lg bg-sun/90 px-3 py-2 text-[11px] font-semibold text-ink shadow ring-1 ring-sun dark:bg-sun/20 dark:text-white dark:ring-sun/30">
							{t("map.tilesFailed")}
						</div>
					) : null}
				</div>

				<p className="px-4 pt-2 font-mono text-[11px] text-ink/50 dark:text-white/50">
					{formatLatLng(place, 4)} ·{" "}
					{t("places.frequentSummary", {
						hours: Math.round(place.minutes / 60),
						days: place.days,
					})}
				</p>

				<div className="flex flex-wrap items-center gap-2 p-4">
					<Button variant="primary" size="sm" onClick={onSetOffice}>
						{t("places.previewOffice")}
					</Button>
					<Button variant="secondary" size="sm" onClick={onSetHome}>
						{t("places.previewHome")}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto"
						onClick={onClose}
					>
						{t("places.close")}
					</Button>
				</div>
			</div>
		</div>
	);
}
