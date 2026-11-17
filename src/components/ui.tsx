import type {
	ButtonHTMLAttributes,
	InputHTMLAttributes,
	ReactNode,
} from "react";

export function cn(
	...values: Array<string | false | null | undefined>
): string {
	return values.filter(Boolean).join(" ");
}

export function GearIcon({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			className={cn("size-4", className)}
		>
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64h.09A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
		</svg>
	);
}

export type Tone =
	| "office"
	| "home"
	| "other"
	| "pto"
	| "muted"
	| "warn"
	| "ok"
	| "info";

const TONE_CLASSES: Record<Tone, string> = {
	office:
		"bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25",
	home: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
	other:
		"bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
	pto: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
	muted:
		"bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
	warn: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
	ok: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
	info: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
};

export const SLICE_CLASSES: Record<"office" | "home" | "other", string> = {
	office: "bg-indigo-500 dark:bg-indigo-400",
	home: "bg-emerald-500 dark:bg-emerald-400",
	other: "bg-amber-400 dark:bg-amber-300",
};

export function Card({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
				className,
			)}
		>
			{children}
		</section>
	);
}

export function SectionHeader({
	step,
	title,
	description,
	action,
}: {
	step?: string;
	title: string;
	description?: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
			<div className="flex items-start gap-3">
				{step ? (
					<span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
						{step}
					</span>
				) : null}
				<div>
					<h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
						{title}
					</h2>
					{description ? (
						<p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
							{description}
						</p>
					) : null}
				</div>
			</div>
			{action ? <div className="flex items-center gap-2">{action}</div> : null}
		</div>
	);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "ghost" | "danger";
	size?: "sm" | "md";
};

export function Button({
	variant = "secondary",
	size = "md",
	className,
	...props
}: ButtonProps) {
	const variants = {
		primary:
			"bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:disabled:bg-slate-600",
		secondary:
			"border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
		ghost:
			"text-slate-600 hover:bg-slate-100 disabled:text-slate-400 dark:text-slate-300 dark:hover:bg-slate-800",
		danger:
			"border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
	};
	return (
		<button
			type="button"
			className={cn(
				"inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed dark:focus-visible:outline-white",
				size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
				variants[variant],
				className,
			)}
			{...props}
		/>
	);
}

export function Badge({
	tone = "muted",
	children,
	className,
}: {
	tone?: Tone;
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
				TONE_CLASSES[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}

export function Stat({
	label,
	value,
	hint,
	tone = "muted",
}: {
	label: string;
	value: ReactNode;
	hint?: string;
	tone?: Tone;
}) {
	const accents: Record<Tone, string> = {
		office: "text-indigo-600 dark:text-indigo-400",
		home: "text-emerald-600 dark:text-emerald-400",
		other: "text-amber-600 dark:text-amber-400",
		pto: "text-violet-600 dark:text-violet-400",
		muted: "text-slate-900 dark:text-slate-100",
		warn: "text-rose-600 dark:text-rose-400",
		ok: "text-emerald-600 dark:text-emerald-400",
		info: "text-sky-600 dark:text-sky-400",
	};
	return (
		<div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
			<div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
				{label}
			</div>
			<div
				className={cn(
					"mt-1 text-2xl font-semibold tabular-nums",
					accents[tone],
				)}
			>
				{value}
			</div>
			{hint ? (
				<div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
					{hint}
				</div>
			) : null}
		</div>
	);
}

export function Field({
	label,
	hint,
	children,
	className,
}: {
	label: string;
	hint?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("block", className)}>
			<span className="text-xs font-medium text-slate-600 dark:text-slate-300">
				{label}
			</span>
			<div className="mt-1.5">{children}</div>
			{hint ? (
				<span className="mt-1.5 block text-xs text-slate-500 dark:text-slate-400">
					{hint}
				</span>
			) : null}
		</div>
	);
}

export function TextInput({
	className,
	...props
}: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			className={cn(
				"w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-white/10",
				className,
			)}
			{...props}
		/>
	);
}

export function Select({
	className,
	children,
	...props
}: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
	return (
		<select
			className={cn(
				"rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-white/10",
				className,
			)}
			{...props}
		>
			{children}
		</select>
	);
}

export function Toggle({
	checked,
	onChange,
	label,
	hint,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
	hint?: string;
}) {
	return (
		<label className="flex cursor-pointer items-start gap-2.5 text-sm">
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-slate-900 accent-slate-900 dark:border-slate-600 dark:accent-white"
			/>
			<span>
				<span className="font-medium text-slate-700 dark:text-slate-200">
					{label}
				</span>
				{hint ? (
					<span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
						{hint}
					</span>
				) : null}
			</span>
		</label>
	);
}

export function formatDuration(minutes: number): string {
	if (minutes <= 0) return "—";
	const hours = Math.floor(minutes / 60);
	const rest = Math.round(minutes % 60);
	if (hours === 0) return `${rest}m`;
	if (rest === 0) return `${hours}h`;
	return `${hours}h ${rest}m`;
}
