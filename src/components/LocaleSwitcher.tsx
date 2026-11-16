import { type Locale, useI18n } from "../lib/i18n";
import { cn } from "./ui";

const LOCALES: Locale[] = ["nl", "en"];

export function LocaleSwitcher() {
	const { locale, setLocale, t } = useI18n();

	return (
		<fieldset className="m-0 flex min-w-0 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
			<legend className="sr-only">{t("app.language")}</legend>
			{LOCALES.map((code) => (
				<button
					key={code}
					type="button"
					onClick={() => setLocale(code)}
					aria-pressed={locale === code}
					className={cn(
						"rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
						locale === code
							? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
							: "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
					)}
				>
					{code}
				</button>
			))}
		</fieldset>
	);
}
