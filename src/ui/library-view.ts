import { App, ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { KindleLibrarySettings } from '../settings';
import { ImportModal } from './import-modal';

export const VIEW_TYPE_LIBRARY = 'kindle-library-view';

interface BookCard {
	file: TFile;
	title: string;
	author: string;
	cover: string;
	publisher: string;
	published: string;
}

export class LibraryView extends ItemView {
	constructor(
		leaf: WorkspaceLeaf,
		private readonly settings: KindleLibrarySettings,
		private readonly pluginApp: App
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_LIBRARY;
	}

	getDisplayText(): string {
		return 'Kindle Library';
	}

	getIcon(): string {
		return 'book-open';
	}

	async onOpen(): Promise<void> {
		this.registerEvent(
			this.app.metadataCache.on('changed', () => this.render())
		);
		this.registerEvent(
			this.app.vault.on('delete', () => this.render())
		);
		await this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	private async render(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('kindle-library-view');

		this.renderHeader(contentEl);

		const books = this.loadBooks();

		if (books.length === 0) {
			this.renderEmpty(contentEl);
			return;
		}

		this.renderGrid(contentEl, books);
	}

	private renderHeader(containerEl: HTMLElement): void {
		const header = containerEl.createDiv('kindle-library-view-header');
		header.createEl('h2', { text: 'Kindle Library' });

		const actions = header.createDiv('kindle-library-view-actions');

		const importBtn = actions.createEl('button', {
			text: 'Import',
			cls: 'mod-cta kindle-library-view-import-btn',
		});
		importBtn.addEventListener('click', () => {
			new ImportModal(this.pluginApp, this.settings).open();
		});
	}

	private renderEmpty(containerEl: HTMLElement): void {
		const empty = containerEl.createDiv('kindle-library-view-empty');
		empty.createDiv('kindle-library-view-empty-icon').innerHTML = EMPTY_SVG;
		empty.createEl('p', { text: 'No books yet. Import your Kindle clippings to get started.' });
		const btn = empty.createEl('button', {
			text: 'Import clippings',
			cls: 'mod-cta',
		});
		btn.addEventListener('click', () => {
			new ImportModal(this.pluginApp, this.settings).open();
		});
	}

	private renderGrid(containerEl: HTMLElement, books: BookCard[]): void {
		const grid = containerEl.createDiv('kindle-library-grid');

		for (const book of books) {
			this.renderCard(grid, book);
		}
	}

	private renderCard(gridEl: HTMLElement, book: BookCard): void {
		const card = gridEl.createDiv('kindle-library-card');

		card.addEventListener('click', () => {
			const leaf = this.app.workspace.getLeaf(false);
			leaf.openFile(book.file);
		});

		// Cover image
		const coverWrap = card.createDiv('kindle-library-card-cover-wrap');
		if (book.cover) {
			const img = coverWrap.createEl('img', { cls: 'kindle-library-card-cover' });
			img.src = book.cover;
			img.alt = book.title;
			img.loading = 'lazy';
			img.onerror = () => {
				img.remove();
				coverWrap.innerHTML = BOOK_PLACEHOLDER_SVG;
			};
		} else {
			coverWrap.innerHTML = BOOK_PLACEHOLDER_SVG;
		}

		// Info
		const info = card.createDiv('kindle-library-card-info');
		info.createEl('p', { text: book.title, cls: 'kindle-library-card-title' });
		info.createEl('p', { text: book.author, cls: 'kindle-library-card-author' });
	}

	private loadBooks(): BookCard[] {
		const folder = this.settings.highlightsFolder;
		const files = this.app.vault.getMarkdownFiles().filter(f => {
			const parent = f.parent?.path ?? '';
			return parent === folder || f.path.startsWith(folder + '/');
		});

		const books: BookCard[] = [];

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;

			books.push({
				file,
				title: String(fm['title'] ?? file.basename),
				author: String(fm['author'] ?? ''),
				cover: String(fm['cover'] ?? ''),
				publisher: String(fm['publisher'] ?? ''),
				published: String(fm['published'] ?? ''),
			});
		}

		return books.sort((a, b) => a.title.localeCompare(b.title));
	}
}

const BOOK_PLACEHOLDER_SVG = `<svg class="kindle-library-card-placeholder-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" aria-hidden="true">
  <rect width="60" height="80" rx="4" fill="currentColor" opacity="0.06"/>
  <path d="M15 20h30M15 30h30M15 40h20" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
  <rect x="18" y="55" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
</svg>`;

const EMPTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none" aria-hidden="true">
  <rect x="10" y="12" width="38" height="52" rx="4" stroke="currentColor" stroke-width="1.5" opacity="0.25"/>
  <rect x="18" y="18" width="38" height="52" rx="4" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
  <path d="M22 32h22M22 40h22M22 48h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
</svg>`;
