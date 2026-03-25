import { App, PluginSettingTab, Setting } from 'obsidian';
import KindleLibraryPlugin from './main';

export interface KindleLibrarySettings {
	highlightsFolder: string;
	googleApiKey: string;
	fileNameTemplate: string;
	noteTemplate: string;
}

export const DEFAULT_NOTE_TEMPLATE = `---
title: "{{title}}"
author: "{{author}}"
cover: "{{coverUrl}}"
publisher: "{{publisher}}"
published: "{{publishedDate}}"
isbn: "{{isbn}}"
tags: [book, kindle]
---

{{#if coverUrl}}
![cover|200]({{coverUrl}})
{{/if}}

# {{title}}
*{{author}}*

{{#if description}}
{{description}}
{{/if}}

---

## Highlights

{{#each highlights}}
> {{text}}

— {{#if page}}page {{page}}, {{/if}}location {{locationStart}}–{{locationEnd}} · {{addedAt}}

{{/each}}`;

export const DEFAULT_SETTINGS: KindleLibrarySettings = {
	highlightsFolder: 'Kindle',
	googleApiKey: '',
	fileNameTemplate: '{{title}} - {{author}}',
	noteTemplate: DEFAULT_NOTE_TEMPLATE,
};

export class KindleLibrarySettingTab extends PluginSettingTab {
	plugin: KindleLibraryPlugin;

	constructor(app: App, plugin: KindleLibraryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Kindle Library' });

		new Setting(containerEl)
			.setName('Highlights folder')
			.setDesc('Vault folder where book notes will be created.')
			.addText(text =>
				text
					.setPlaceholder('Kindle')
					.setValue(this.plugin.settings.highlightsFolder)
					.onChange(async value => {
						this.plugin.settings.highlightsFolder = value.trim() || 'Kindle';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Google Books API key')
			.setDesc(
				'Optional. Provide an API key to avoid rate limits when fetching book metadata from Google Books.'
			)
			.addText(text =>
				text
					.setPlaceholder('AIza...')
					.setValue(this.plugin.settings.googleApiKey)
					.onChange(async value => {
						this.plugin.settings.googleApiKey = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('File name template')
			.setDesc(
				'Template for note file names. Available variables: {{title}}, {{author}}.'
			)
			.addText(text =>
				text
					.setPlaceholder('{{title}} - {{author}}')
					.setValue(this.plugin.settings.fileNameTemplate)
					.onChange(async value => {
						this.plugin.settings.fileNameTemplate =
							value.trim() || '{{title}} - {{author}}';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Note template')
			.setDesc(
				'Handlebars-style template for book notes. Available variables: {{title}}, {{author}}, {{coverUrl}}, {{publisher}}, {{publishedDate}}, {{isbn}}, {{description}}, {{highlights}}.'
			)
			.addTextArea(text => {
				text
					.setPlaceholder(DEFAULT_NOTE_TEMPLATE)
					.setValue(this.plugin.settings.noteTemplate)
					.onChange(async value => {
						this.plugin.settings.noteTemplate = value || DEFAULT_NOTE_TEMPLATE;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 20;
				text.inputEl.classList.add('kindle-library-template-textarea');
			});

		new Setting(containerEl).addButton(btn =>
			btn
				.setButtonText('Reset template to default')
				.onClick(async () => {
					this.plugin.settings.noteTemplate = DEFAULT_NOTE_TEMPLATE;
					await this.plugin.saveSettings();
					this.display();
				})
		);
	}
}
