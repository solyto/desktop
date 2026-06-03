<script lang="ts">
	const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

	function minimize() {
		(window as any).electronAPI?.minimize();
	}

	function maximize() {
		(window as any).electronAPI?.maximize();
	}

	function close() {
		(window as any).electronAPI?.close();
	}
</script>

{#if isElectron}
	<div class="flex h-8 w-full shrink-0 items-center bg-c-bg" style="-webkit-app-region: drag">
		<div class="grow"></div>
		<div class="flex items-center" style="-webkit-app-region: no-drag">
			<button
				onclick={minimize}
				class="flex h-8 w-10 items-center justify-center text-c-neutral-5 hover:bg-c-neutral-2 hover:text-c-neutral-8 dark:hover:bg-c-neutral-8 dark:hover:text-c-neutral-2"
			>
				<svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
					<rect width="10" height="1" />
				</svg>
			</button>
			<button
				onclick={maximize}
				class="flex h-8 w-10 items-center justify-center text-c-neutral-5 hover:bg-c-neutral-2 hover:text-c-neutral-8 dark:hover:bg-c-neutral-8 dark:hover:text-c-neutral-2"
			>
				<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="1" y="1" width="8" height="8" />
				</svg>
			</button>
			<button
				onclick={close}
				class="flex h-8 w-10 items-center justify-center text-c-neutral-5 hover:bg-red-500 hover:text-white"
			>
				<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
					<path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
			</button>
		</div>
	</div>
{/if}
