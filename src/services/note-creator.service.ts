import { App, TFile, normalizePath } from 'obsidian';
import { BookNote, Highlight } from '../types';
import { KindleLibrarySettings } from '../settings';

const PROPERTY_OPTIONS_FILENAME = '_kindle-library-options.md';
const PROPERTY_OPTIONS_CONTENT = `---
status:
  - read
  - in-progress
  - want-to-read
rating:
  - ☆☆☆☆☆
  - ★☆☆☆☆
  - ★★☆☆☆
  - ★★★☆☆
  - ★★★★☆
  - ★★★★★
---
`;

export class NoteCreatorService {
	constructor(
		private readonly app: App,
		private readonly settings: KindleLibrarySettings
	) {}

	async createOrUpdateNote(bookNote: BookNote): Promise<TFile> {
		const { book, parsedBook } = bookNote;

		const folderPath = normalizePath(this.settings.highlightsFolder);
		await this.ensureFolder(folderPath);
		await this.ensurePropertyOptionsFile(folderPath);

		const fileName = this.renderTemplate(this.settings.fileNameTemplate, {
			title: book.title || parsedBook.rawTitle,
			author: book.authors.join(', ') || parsedBook.rawAuthor,
		});

		const safeFileName = sanitizeFileName(fileName);
		const filePath = normalizePath(`${folderPath}/${safeFileName}.md`);

		const content = this.buildNoteContent(bookNote);

		const existing = this.app.vault.getAbstractFileByPath(filePath);
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
			return existing;
		}

		return await this.app.vault.create(filePath, content);
	}

	private buildNoteContent(bookNote: BookNote): string {
		const { book, parsedBook } = bookNote;
		const highlights = parsedBook.highlights.filter(h => h.type !== 'bookmark' && h.text);

		const vars: Record<string, string> = {
			title: book.title || parsedBook.rawTitle,
			author: book.authors.join(', ') || parsedBook.rawAuthor,
			coverUrl: book.coverUrl ?? '',
			publisher: book.publisher ?? '',
			publishedDate: book.publishedDate ?? '',
			isbn: book.isbn13 ?? book.isbn10 ?? '',
			description: book.description ?? '',
		};

		let content = this.settings.noteTemplate;

		// Replace {{#if var}} ... {{/if}} blocks
		content = content.replace(
			/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
			(_, key: string, inner: string) => (vars[key] ? inner : '')
		);

		// Replace {{#each highlights}} ... {{/each}} block
		content = content.replace(
			/\{\{#each highlights\}\}([\s\S]*?)\{\{\/each\}\}/g,
			(_, template: string) => highlights.map(h => renderHighlight(template, h)).join('')
		);

		// Replace simple {{var}} placeholders
		for (const [key, value] of Object.entries(vars)) {
			content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
		}

		return content.trim() + '\n';
	}

	private renderTemplate(template: string, vars: Record<string, string>): string {
		return Object.entries(vars).reduce(
			(result, [key, value]) =>
				result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
			template
		);
	}

	private async ensureFolder(folderPath: string): Promise<void> {
		const exists = this.app.vault.getAbstractFileByPath(folderPath);
		if (!exists) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	private async ensurePropertyOptionsFile(folderPath: string): Promise<void> {
		const optionsPath = normalizePath(`${folderPath}/${PROPERTY_OPTIONS_FILENAME}`);
		const existing = this.app.vault.getAbstractFileByPath(optionsPath);
		if (!(existing instanceof TFile)) {
			await this.app.vault.create(optionsPath, PROPERTY_OPTIONS_CONTENT);
		}
	}
}

function renderHighlight(template: string, highlight: Highlight): string {
	const dateStr = highlight.addedAt
		? highlight.addedAt.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
		  })
		: '';

	const vars: Record<string, string> = {
		text: highlight.text,
		page: highlight.page != null ? String(highlight.page) : '',
		locationStart: highlight.locationStart != null ? String(highlight.locationStart) : '',
		locationEnd: highlight.locationEnd != null ? String(highlight.locationEnd) : '',
		addedAt: dateStr,
	};

	let result = template;

	// Handle {{#if page}} ... {{/if}} inside highlight template
	result = result.replace(
		/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
		(_, key: string, inner: string) => (vars[key] ? inner : '')
	);

	for (const [key, value] of Object.entries(vars)) {
		result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
	}

	return result;
}

/**
 * Replaces characters that are forbidden in file system paths / Obsidian file names.
 */
function sanitizeFileName(name: string): string {
	return name
		.replace(/[\\/:*?"<>|#^[\]]/g, '')
		.replace(/\s{2,}/g, ' ')
		.trim()
		.slice(0, 200);
}
