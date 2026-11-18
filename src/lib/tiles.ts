/**
 * All key-free. The second one is only used when the main OSM tile server
 * fails repeatedly (blocked network, tough proxy, rate limit).
 */
export const TILE_PROVIDERS = [
	"https://tile.openstreetmap.org/{z}/{x}/{y}.png",
	"https://tile.openstreetmap.de/{z}/{x}/{y}.png",
];

export const TILE_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
