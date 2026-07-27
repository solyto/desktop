// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	type UpdaterStatus =
		| { type: 'idle' }
		| { type: 'checking' }
		| { type: 'up-to-date' }
		| { type: 'available'; version: string }
		| { type: 'downloading'; percent: number }
		| { type: 'ready' }
		| { type: 'error' };

	interface Window {
		electronAPI?: {
			minimize: () => void;
			maximize: () => void;
			close: () => void;
			checkForUpdates: () => Promise<void>;
			installUpdate: () => void;
			onUpdaterStatus: (callback: (status: UpdaterStatus) => void) => () => void;
		};
	}
}

export {};
