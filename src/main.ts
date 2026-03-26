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
<rect x="18" y="6" width="64" height="88" rx="7" fill="#EC4899"/>
<rect x="18" y="6" width="14" height="88" rx="7" fill="#BE185D"/>
<rect x="32" y="6" width="3" height="88" fill="#BE185D"/>
<rect x="36" y="18" width="36" height="52" rx="3" fill="#FFF1F7"/>
<path d="M41 32 L66 32" stroke="#BE185D" stroke-width="4" stroke-linecap="round"/>
<path d="M41 42 L66 42" stroke="#BE185D" stroke-width="4" stroke-linecap="round"/>
<path d="M41 52 L58 52" stroke="#BE185D" stroke-width="4" stroke-linecap="round"/>
<circle cx="50" cy="82" r="5" fill="#FFF1F7" opacity="0.55"/>
`;
