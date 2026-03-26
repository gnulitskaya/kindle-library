import { Plugin, WorkspaceLeaf, addIcon } from 'obsidian';
import { t } from './i18n';
import { DEFAULT_SETTINGS, KindleLibrarySettings, KindleLibrarySettingTab } from './settings';
import { ImportModal } from './ui/import-modal';
import { LibraryView, VIEW_TYPE_LIBRARY } from './ui/library-view';

export default class KindleLibraryPlugin extends Plugin {
	settings: KindleLibrarySettings;

	async onload() {
		addIcon('kindle-library', KINDLE_ICON_SVG);
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_LIBRARY,
			leaf => new LibraryView(leaf, this.settings, this.app)
		);

		this.addCommand({
			id: 'open-kindle-library',
			name: t().commands.openLibrary,
			callback: () => this.openLibraryView(),
		});

		this.addCommand({
			id: 'import-kindle-clippings',
			name: t().commands.importClippings,
			callback: () => {
				new ImportModal(this.app, this.settings).open();
			},
		});

		this.addRibbonIcon('kindle-library', t().commands.ribbonTooltip, () => this.openLibraryView());

		this.addSettingTab(new KindleLibrarySettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_LIBRARY);
	}

	private async openLibraryView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_LIBRARY);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0] as WorkspaceLeaf);
			return;
		}
		const leaf = this.app.workspace.getLeaf('tab');
		await leaf.setViewState({ type: VIEW_TYPE_LIBRARY, active: true });
		this.app.workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<KindleLibrarySettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// SVG content for addIcon (wrapped by Obsidian in a 100×100 viewBox)
const KINDLE_ICON_SVG = `
<g transform="translate(11.03 4) scale(0.2705882) translate(-106 -96)">
  <rect x="106" y="96" width="300" height="340" rx="40" fill="#ff92c2" stroke="#1a1a1a" stroke-width="8"/>
  <rect x="156" y="146" width="200" height="220" rx="12" fill="#ffffff" stroke="#1a1a1a" stroke-width="6"/>
  <path d="M210 240C210 220 240 220 240 240C240 260 210 260 210 240Z" fill="#1a1a1a"/>
  <path d="M272 240C272 220 302 220 302 240C302 260 272 260 272 240Z" fill="#1a1a1a"/>
  <path d="M220 300C240 320 272 320 292 300" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/>
  <path d="M244 308C252 320 268 320 276 308" fill="#ff92c2"/>
  <text x="256" y="410" text-anchor="middle" font-size="40" font-family="Arial, sans-serif" fill="#1a1a1a">KINDLE</text>
</g>
`;
