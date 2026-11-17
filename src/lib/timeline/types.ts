export type TimelineFormat = "device";

export type ParsedVisit = {
	/** Wall-clock milliseconds (see lib/time.ts). */
	startWall: number;
	endWall: number;
	durationMs: number;
	lat: number;
	lng: number;
	/** Google's own label, e.g. HOME / WORK / UNKNOWN. */
	semanticType?: string;
	placeId?: string;
	/** Android exports flag nested places this way; 0 is a top-level place. */
	hierarchyLevel: number;
};

export type ParsedPoint = {
	wall: number;
	lat: number;
	lng: number;
	accuracyMeters?: number;
};

export type FrequentPlace = {
	lat: number;
	lng: number;
	label?: string;
	placeId?: string;
};

export type FileReport = {
	name: string;
	bytes: number;
	format: TimelineFormat;
	visits: number;
	points: number;
	error?: string;
};

export type ParsedHistory = {
	visits: ParsedVisit[];
	points: ParsedPoint[];
	frequentPlaces: FrequentPlace[];
	files: FileReport[];
	warnings: string[];
	/** Wall-clock ms of the earliest / latest data point, if any. */
	range: { startWall: number; endWall: number } | null;
};
