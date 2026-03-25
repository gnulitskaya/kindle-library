import { Plugin, WorkspaceLeaf } from 'obsidian';
import { t } from './i18n';
import { DEFAULT_SETTINGS, KindleLibrarySettings, KindleLibrarySettingTab } from './settings';
import { ImportModal } from './ui/import-modal';
import { LibraryView, VIEW_TYPE_LIBRARY } from './ui/library-view';

export default class KindleLibraryPlugin extends Plugin {
	settings: KindleLibrarySettings;

	async onload() {
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

		this.addRibbonIcon('book-open', t().commands.ribbonTooltip, () => this.openLibraryView());

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
