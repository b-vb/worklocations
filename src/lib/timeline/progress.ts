export type ParseProgress =
	| { phase: "reading"; name: string; index: number; total: number }
	| { phase: "building" };
