import { App, PluginSettingTab, Setting, moment } from 'obsidian';
import { t } from './i18n';
import KindleLibraryPlugin from './main';

export interface KindleLibrarySettings {
	highlightsFolder: string;
	googleApiKey: string;
	fileNameTemplate: string;
	noteTemplate: string;
}

const DEFAULT_NOTE_TEMPLATE_RU = `---
title: "{{title}}"
author: "{{author}}"
cover: "{{coverUrl}}"
publisher: "{{publisher}}"
published: "{{publishedDate}}"
isbn: "{{isbn}}"
status: "read"
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

## Вопросы для работы с книгой

1. Почему я выбрал эту книгу? Что хотел узнать?
2. Какова главная идея книги?
3. Что удивило меня или поменяло моё мнение?
4. Что я хочу применить из прочитанного?
5. Три ключевые мысли, которые стоит запомнить.

---

## Highlights

{{#each highlights}}
> {{text}}

<span class="kindle-library-highlight-meta">— {{#if page}}page {{page}}, {{/if}}location {{locationStart}}–{{locationEnd}} · {{addedAt}}</span>

{{/each}}`;

const DEFAULT_NOTE_TEMPLATE_EN = `---
title: "{{title}}"
author: "{{author}}"
cover: "{{coverUrl}}"
publisher: "{{publisher}}"
published: "{{publishedDate}}"
isbn: "{{isbn}}"
status: "read"
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

## Questions to work with the book

1. Why did I choose this book? What did I want to learn?
2. What is the main idea of the book?
3. What surprised me or changed my mind?
4. What do I want to apply from what I read?
5. Three key insights I want to remember.

---

## Highlights

{{#each highlights}}
> {{text}}

<span class="kindle-library-highlight-meta">— {{#if page}}page {{page}}, {{/if}}location {{locationStart}}–{{locationEnd}} · {{addedAt}}</span>

{{/each}}`;

export function getDefaultNoteTemplate(): string {
	const lang = moment.locale().slice(0, 2);
	return lang === 'ru' ? DEFAULT_NOTE_TEMPLATE_RU : DEFAULT_NOTE_TEMPLATE_EN;
}

export const DEFAULT_SETTINGS: KindleLibrarySettings = {
	highlightsFolder: 'Kindle',
	googleApiKey: '',
	fileNameTemplate: '{{title}} - {{author}}',
	noteTemplate: getDefaultNoteTemplate(),
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

		const i18n = t().settings;

		containerEl.createEl('h2', { text: i18n.heading });

		new Setting(containerEl)
			.setName(i18n.highlightsFolder.name)
			.setDesc(i18n.highlightsFolder.desc)
			.addText(text =>
				text
					.setPlaceholder(i18n.highlightsFolder.placeholder)
					.setValue(this.plugin.settings.highlightsFolder)
					.onChange(async value => {
						this.plugin.settings.highlightsFolder = value.trim() || 'Kindle';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(i18n.googleApiKey.name)
			.setDesc(i18n.googleApiKey.desc)
			.addText(text =>
				text
					.setPlaceholder(i18n.googleApiKey.placeholder)
					.setValue(this.plugin.settings.googleApiKey)
					.onChange(async value => {
						this.plugin.settings.googleApiKey = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(i18n.fileNameTemplate.name)
			.setDesc(i18n.fileNameTemplate.desc)
			.addText(text =>
				text
					.setPlaceholder(i18n.fileNameTemplate.placeholder)
					.setValue(this.plugin.settings.fileNameTemplate)
					.onChange(async value => {
						this.plugin.settings.fileNameTemplate =
							value.trim() || '{{title}} - {{author}}';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(i18n.noteTemplate.name)
			.setDesc(i18n.noteTemplate.desc)
			.addTextArea(text => {
				const defaultTemplate = getDefaultNoteTemplate();
				text
					.setPlaceholder(defaultTemplate)
					.setValue(this.plugin.settings.noteTemplate)
					.onChange(async value => {
						this.plugin.settings.noteTemplate = value || defaultTemplate;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 20;
				text.inputEl.classList.add('kindle-library-template-textarea');
			});

		new Setting(containerEl).addButton(btn =>
			btn
				.setButtonText(i18n.resetTemplate)
				.onClick(async () => {
					this.plugin.settings.noteTemplate = getDefaultNoteTemplate();
					await this.plugin.saveSettings();
					this.display();
				})
		);
	}
}
