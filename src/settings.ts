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
rating: "☆☆☆☆☆"
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

### 🚀 The Book in 3 Sentences
Три фразы - и ты сразу вспоминаешь суть книги.
> [ваш ответ тут]

### ☘️ How the Book Changed Me
Что изменилось в мыслях или поведении.
> [ваш ответ тут]

### ✍️ Top 3 Quotes
Цитаты, к которым хочется возвращаться.
> [ваш ответ тут]

### 📒 Summary + Notes
Полезные заметки и идеи для пересмотра.
> [ваш ответ тут]

---

## Highlights

{{#each highlights}}
> {{text}}
<span class="kindle-library-highlight-meta">— {{#if page}}page {{page}}, {{/if}}{{locationStart}}–{{locationEnd}} · {{addedAt}}</span>

{{/each}}`;

const DEFAULT_NOTE_TEMPLATE_EN = `---
title: "{{title}}"
author: "{{author}}"
cover: "{{coverUrl}}"
publisher: "{{publisher}}"
published: "{{publishedDate}}"
isbn: "{{isbn}}"
status: "read"
rating: "☆☆☆☆☆"
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

### 🚀 The Book in 3 Sentences
Capture the core idea in three short sentences.
> [your answer here]

### ☘️ How the Book Changed Me
What changed in my thinking or behavior.
> [your answer here]

### ✍️ Top 3 Quotes
Quotes worth coming back to.
> [your answer here]

### 📒 Summary + Notes
Useful notes and ideas to revisit later.
> [your answer here]

---

## Highlights

{{#each highlights}}
> {{text}}
<span class="kindle-library-highlight-meta">— {{#if page}}page {{page}}, {{/if}}{{locationStart}}–{{locationEnd}} · {{addedAt}}</span>

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
