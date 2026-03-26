import { App, TFile, normalizePath } from 'obsidian';
import { GoogleBookVolume, ParsedBook } from '../types';
import { KindleLibrarySettings } from '../settings';

export const REGISTRY_FILENAME = '_kindle-library-index.md';

interface RegistryEntry {
	rawTitle: string;
	rawAuthor: string;
	googleTitle: string;
	googleAuthor: string;
	addedAt: string;
}

function normalize(s: string): string {
	return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function escapeCell(s: string): string {
	return s.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

function parseTableRows(content: string): RegistryEntry[] {
	const tableLines = content.split('\n').filter(l => l.trim().startsWith('|'));
	// First line — header, second — separator |---|
	return tableLines.slice(2).map(line => {
		const cells = line.split('|').slice(1, -1).map(c => c.trim());
		return {
			rawTitle: cells[0] ?? '',
			rawAuthor: cells[1] ?? '',
			googleTitle: cells[2] ?? '',
			googleAuthor: cells[3] ?? '',
			addedAt: cells[4] ?? '',
		};
	}).filter(e => e.rawTitle);
}

export class BookRegistryService {
	constructor(
		private readonly app: App,
		private readonly settings: KindleLibrarySettings
	) {}

	async isRegistered(parsedBook: ParsedBook): Promise<boolean> {
		const entries = await this.loadEntries();
		const normRaw = normalize(parsedBook.rawTitle);
		return entries.some(e =>
			normalize(e.rawTitle) === normRaw ||
			(e.googleTitle && normalize(e.googleTitle) === normRaw)
		);
	}

	async register(parsedBook: ParsedBook, bookVolume: GoogleBookVolume | null): Promise<void> {
		const entries = await this.loadEntries();
		const today = new Date().toISOString().split('T')[0] ?? '';
		entries.push({
			rawTitle: parsedBook.rawTitle,
			rawAuthor: parsedBook.rawAuthor,
			googleTitle: bookVolume?.title ?? '',
			googleAuthor: bookVolume?.authors.join(', ') ?? '',
			addedAt: today,
		});
		await this.saveEntries(entries);
	}

	private getRegistryPath(): string {
		return normalizePath(`${this.settings.highlightsFolder}/${REGISTRY_FILENAME}`);
	}

	private async loadEntries(): Promise<RegistryEntry[]> {
		const file = this.app.vault.getAbstractFileByPath(this.getRegistryPath());
		if (!(file instanceof TFile)) return [];
		const content = await this.app.vault.read(file);
		return parseTableRows(content);
	}

	private async saveEntries(entries: RegistryEntry[]): Promise<void> {
		const folderPath = normalizePath(this.settings.highlightsFolder);
		if (!this.app.vault.getAbstractFileByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}

		const warning = `> [!warning]\n> Этот файл создан плагином **Kindle Library** для отслеживания импортированных книг. **Не изменяйте его вручную.**\n\n`;
		const tableHeader = `| Название (Kindle) | Автор (Kindle) | Название (Google Books) | Автор (Google Books) | Дата добавления |\n|---|---|---|---|---|\n`;
		const rows = entries
			.map(e => `| ${escapeCell(e.rawTitle)} | ${escapeCell(e.rawAuthor)} | ${escapeCell(e.googleTitle)} | ${escapeCell(e.googleAuthor)} | ${e.addedAt} |`)
			.join('\n');

		const content = warning + tableHeader + rows + '\n';
		const path = this.getRegistryPath();
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
		} else {
			await this.app.vault.create(path, content);
		}
	}
}
