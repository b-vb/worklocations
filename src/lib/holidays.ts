import { DAY_MS, dayKey, dayKeyToWallStart, eachDayKey } from "./time";

const cache = new Map<number, Map<string, string>>();

function key(year: number, month: number, day: number): string {
	return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Anonymous Gregorian algorithm. */
function easterSunday(year: number): { month: number; day: number } {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return { month, day };
}

function addDays(
	base: { year: number; month: number; day: number },
	offset: number,
): string {
	return dayKey(
		Date.UTC(base.year, base.month - 1, base.day) + offset * DAY_MS,
	);
}

/**
 * Dutch public holidays. Goede Vrijdag and Bevrijdingsdag are included because
 * most employers treat them as non-working days; the UI lets you turn the
 * whole list off.
 */
export function dutchHolidays(year: number): Map<string, string> {
	const cached = cache.get(year);
	if (cached) return cached;

	const easter = { year, ...easterSunday(year) };
	const map = new Map<string, string>();
	map.set(key(year, 1, 1), "Nieuwjaarsdag");
	map.set(addDays(easter, -2), "Goede Vrijdag");
	map.set(addDays(easter, 0), "Eerste Paasdag");
	map.set(addDays(easter, 1), "Tweede Paasdag");

	const kingsDay = new Date(Date.UTC(year, 3, 27));
	const kingsDayKey = key(year, 4, kingsDay.getUTCDay() === 0 ? 26 : 27);
	map.set(kingsDayKey, "Koningsdag");

	map.set(key(year, 5, 5), "Bevrijdingsdag");
	map.set(addDays(easter, 39), "Hemelvaartsdag");
	map.set(addDays(easter, 49), "Eerste Pinksterdag");
	map.set(addDays(easter, 50), "Tweede Pinksterdag");
	map.set(key(year, 12, 25), "Eerste Kerstdag");
	map.set(key(year, 12, 26), "Tweede Kerstdag");

	cache.set(year, map);
	return map;
}

export function holidaysInRange(from: string, to: string): Map<string, string> {
	const result = new Map<string, string>();
	const startYear = new Date(dayKeyToWallStart(from)).getUTCFullYear();
	const endYear = new Date(dayKeyToWallStart(to)).getUTCFullYear();
	for (let year = startYear; year <= endYear; year += 1) {
		for (const [date, name] of dutchHolidays(year)) result.set(date, name);
	}
	return new Map(
		eachDayKey(from, to)
			.filter((date) => result.has(date))
			.map((date) => [date, result.get(date) ?? ""]),
	);
}

const HOLIDAY_EN: Record<string, string> = {
	Nieuwjaarsdag: "New Year's Day",
	"Goede Vrijdag": "Good Friday",
	"Eerste Paasdag": "Easter Sunday",
	"Tweede Paasdag": "Easter Monday",
	Koningsdag: "King's Day",
	Bevrijdingsdag: "Liberation Day",
	Hemelvaartsdag: "Ascension Day",
	"Eerste Pinksterdag": "Whit Sunday",
	"Tweede Pinksterdag": "Whit Monday",
	"Eerste Kerstdag": "Christmas Day",
	"Tweede Kerstdag": "Boxing Day",
};

export function holidayLabel(name: string, locale: "nl" | "en"): string {
	return locale === "en" ? (HOLIDAY_EN[name] ?? name) : name;
}
