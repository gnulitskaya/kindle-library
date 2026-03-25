import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, KindleLibrarySettings, KindleLibrarySettingTab } from './settings';
import { ImportModal } from './ui/import-modal';

export default class KindleLibraryPlugin extends Plugin {
	settings: KindleLibrarySettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'import-kindle-clippings',
			name: 'Import Kindle clippings',
			callback: () => {
				new ImportModal(this.app, this.settings).open();
			},
		});

		this.addRibbonIcon('book-open', 'Import Kindle clippings', () => {
			new ImportModal(this.app, this.settings).open();
		});

		this.addSettingTab(new KindleLibrarySettingTab(this.app, this));
	}

	onunload() {}

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
