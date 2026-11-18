import { type Locale, useI18n } from "../lib/i18n";
import { cn } from "./ui";

const LOCALES: Locale[] = ["nl", "en"];

export function LocaleSwitcher() {
	const { locale, setLocale, t } = useI18n();

	return (
		<fieldset className="m-0 flex min-w-0 rounded-full border-2 border-ink/15 bg-white/70 p-0.5 dark:border-white/15 dark:bg-white/5">
			<legend className="sr-only">{t("app.language")}</legend>
			{LOCALES.map((code) => (
				<button
					key={code}
					type="button"
					onClick={() => setLocale(code)}
					aria-pressed={locale === code}
					className={cn(
						"rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide transition-colors",
						locale === code
							? "bg-coral text-white dark:bg-white dark:text-night"
							: "text-ink/55 hover:bg-sun/30 dark:text-white/60 dark:hover:bg-white/10",
					)}
				>
					{code}
				</button>
			))}
		</fieldset>
	);
}
