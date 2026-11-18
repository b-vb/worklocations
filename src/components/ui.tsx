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
	office: "bg-sky/45 text-ink",
	home: "bg-mint/55 text-ink",
	other: "bg-sun/70 text-ink",
	pto: "bg-lilac/60 text-ink",
	muted: "bg-ink/10 text-ink/65",
	warn: "bg-coral/20 text-coral",
	ok: "bg-mint/55 text-ink",
	info: "bg-sky/40 text-ink",
};

export const SLICE_CLASSES: Record<"office" | "home" | "other", string> = {
	office: "bg-sky",
	home: "bg-mint",
	other: "bg-sun",
};

const STEP_STYLES = [
	"bg-coral text-white",
	"bg-sun text-ink",
	"bg-mint text-ink",
	"bg-sky text-ink",
	"bg-lilac text-ink",
];

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
				"rounded-[26px] border-2 border-ink/10 bg-white/90 shadow-[0_5px_0_rgba(34,48,57,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-night-card/95 dark:shadow-[0_5px_0_rgba(0,0,0,0.35)]",
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
	const stepStyle = step
		? STEP_STYLES[(Number(step) - 1) % STEP_STYLES.length]
		: "";

	return (
		<div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink/8 px-5 py-4 dark:border-white/10">
			<div className="flex items-start gap-3">
				{step ? (
					<span
						className={cn(
							"mt-0.5 flex size-8 shrink-0 -rotate-3 items-center justify-center rounded-xl border-2 border-ink/15 text-sm font-black shadow-[0_2px_0_rgba(34,48,57,0.15)]",
							stepStyle,
						)}
					>
						{step}
					</span>
				) : null}
				<div>
					<h2 className="text-lg font-extrabold tracking-tight text-ink dark:text-white">
						{title}
					</h2>
					{description ? (
						<p className="mt-1 max-w-2xl text-sm font-medium text-ink/60 dark:text-white/60">
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
			"border-2 border-ink/15 bg-coral font-black text-white shadow-[0_3px_0_#c94a4a] hover:bg-[#ff5a5a] active:translate-y-0.5 active:shadow-[0_1px_0_#c94a4a] disabled:bg-coral/40 disabled:text-white/70",
		secondary:
			"border-2 border-ink/15 bg-white font-bold text-ink shadow-[0_3px_0_rgba(34,48,57,0.12)] hover:bg-sun/25 active:translate-y-0.5 active:shadow-none dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
		ghost:
			"border-2 border-transparent font-bold text-ink/65 hover:bg-sun/30 hover:text-ink dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white",
		danger:
			"border-2 border-coral/30 bg-coral/10 font-bold text-coral hover:bg-coral/20",
	};
	return (
		<button
			type="button"
			className={cn(
				"inline-flex items-center justify-center gap-1.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-not-allowed",
				size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
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
				"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
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
	const cardTones: Record<Tone, string> = {
		office: "bg-sky/20 border-sky/50",
		home: "bg-mint/25 border-mint/60",
		other: "bg-sun/30 border-sun/60",
		pto: "bg-lilac/25 border-lilac/60",
		muted: "bg-white/70 border-ink/10 dark:bg-white/5 dark:border-white/10",
		warn: "bg-coral/10 border-coral/30",
		ok: "bg-mint/25 border-mint/60",
		info: "bg-sky/20 border-sky/50",
	};
	const valueTones: Record<Tone, string> = {
		office: "text-ink dark:text-white",
		home: "text-ink dark:text-white",
		other: "text-ink dark:text-white",
		pto: "text-ink dark:text-white",
		muted: "text-ink dark:text-white",
		warn: "text-coral",
		ok: "text-ink dark:text-white",
		info: "text-ink dark:text-white",
	};
	return (
		<div
			className={cn(
				"rounded-2xl border-2 px-4 py-3 shadow-[0_3px_0_rgba(34,48,57,0.06)]",
				cardTones[tone],
			)}
		>
			<div className="text-[11px] font-black uppercase tracking-wider text-ink/50 dark:text-white/50">
				{label}
			</div>
			<div
				className={cn(
					"mt-1 text-3xl font-black tabular-nums",
					valueTones[tone],
				)}
			>
				{value}
			</div>
			{hint ? (
				<div className="mt-0.5 text-xs font-medium text-ink/50 dark:text-white/50">
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
			<span className="text-xs font-bold text-ink/65 dark:text-white/65">
				{label}
			</span>
			<div className="mt-1.5">{children}</div>
			{hint ? (
				<span className="mt-1.5 block text-xs font-medium text-ink/45 dark:text-white/45">
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
				"w-full rounded-xl border-2 border-ink/15 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-ink shadow-[0_2px_0_rgba(34,48,57,0.06)] outline-none transition placeholder:font-normal placeholder:text-ink/35 focus:border-coral focus:ring-4 focus:ring-coral/15 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:border-coral",
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
				"rounded-xl border-2 border-ink/15 bg-white/80 px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:border-coral focus:ring-4 focus:ring-coral/15 dark:border-white/15 dark:bg-white/5 dark:text-white",
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
				className="mt-0.5 size-4 shrink-0 rounded border-ink/30 accent-coral dark:border-white/30"
			/>
			<span>
				<span className="font-bold text-ink/80 dark:text-white/80">
					{label}
				</span>
				{hint ? (
					<span className="mt-0.5 block text-xs font-medium text-ink/45 dark:text-white/45">
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
