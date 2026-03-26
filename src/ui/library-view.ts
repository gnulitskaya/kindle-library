import { App, ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { t } from '../i18n';
import { KindleLibrarySettings } from '../settings';
import { ImportModal } from './import-modal';
import { ManualAddModal } from './manual-add-modal';

export const VIEW_TYPE_LIBRARY = 'kindle-library-view';

interface BookCard {
	file: TFile;
	title: string;
	author: string;
	cover: string;
	publisher: string;
	published: string;
	status: string;
}

type StatusFilter = 'all' | 'read' | 'in-progress' | 'want-to-read';

export class LibraryView extends ItemView {
	private statusFilter: StatusFilter = 'all';

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
		return t().libraryView.displayText;
	}

	getIcon(): string {
		return 'kindle-library';
	}

	async onOpen(): Promise<void> {
		this.registerEvent(
			this.app.metadataCache.on('resolved', () => this.render())
		);
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

		const books = this.loadBooks();
		const filteredBooks = this.applyFilter(books);

		this.renderHeader(contentEl, books);
		this.renderFilterBar(contentEl, books.length, filteredBooks.length);

		if (books.length === 0) {
			this.renderEmpty(contentEl);
			return;
		}

		if (filteredBooks.length === 0) {
			this.renderNoMatches(contentEl);
			return;
		}

		this.renderGrid(contentEl, filteredBooks);
	}

	private renderHeader(containerEl: HTMLElement, books: BookCard[]): void {
		const i18n = t().libraryView;
		const header = containerEl.createDiv('kindle-library-view-header');

		const titleBlock = header.createDiv('kindle-library-view-title-block');
		titleBlock.createEl('h2', { text: i18n.heading });
		// TODO: Add stats
		// if (books.length > 0) {
		// 	const readCount = books.filter(b => !b.status || b.status === 'read').length;
		// 	const stats = titleBlock.createDiv('kindle-library-view-stats');
		// 	stats.createSpan({ text: i18n.statsTotal(books.length), cls: 'kindle-library-stat' });
		// 	stats.createSpan({ text: ' · ', cls: 'kindle-library-stat-sep' });
		// 	stats.createSpan({ text: i18n.statsRead(readCount), cls: 'kindle-library-stat' });
		// }

		const actions = header.createDiv('kindle-library-view-actions');
		const manualBtn = actions.createEl('button', {
			text: i18n.addManualBtn,
			cls: 'kindle-library-view-manual-btn',
		});
		manualBtn.addEventListener('click', () => {
			new ManualAddModal(this.pluginApp, this.settings).open();
		});

		const importBtn = actions.createEl('button', {
			text: i18n.importBtn,
			cls: 'mod-cta kindle-library-view-import-btn',
		});
		importBtn.addEventListener('click', () => {
			new ImportModal(this.pluginApp, this.settings).open();
		});
	}

	private renderEmpty(containerEl: HTMLElement): void {
		const i18n = t().libraryView;
		const empty = containerEl.createDiv('kindle-library-view-empty');
		empty.createDiv('kindle-library-view-empty-icon').innerHTML = EMPTY_SVG;
		empty.createEl('p', { text: i18n.emptyText });
		const btn = empty.createEl('button', {
			text: i18n.importClippingsBtn,
			cls: 'mod-cta',
		});
		btn.addEventListener('click', () => {
			new ImportModal(this.pluginApp, this.settings).open();
		});
	}

	private renderNoMatches(containerEl: HTMLElement): void {
		containerEl.createEl('p', {
			text: t().libraryView.noFilteredBooks,
			cls: 'kindle-library-filter-empty',
		});
	}

	private renderFilterBar(containerEl: HTMLElement, total: number, shown: number): void {
		const i18n = t().libraryView;
		const wrap = containerEl.createDiv('kindle-library-filter-row');
		wrap.createEl('span', { text: i18n.filterLabel, cls: 'kindle-library-filter-label' });

		const select = wrap.createEl('select', { cls: 'kindle-library-filter-select' });
		const options: Array<{ value: StatusFilter; label: string }> = [
			{ value: 'all', label: i18n.filterAll },
			{ value: 'read', label: i18n.filterRead },
			{ value: 'in-progress', label: i18n.filterInProgress },
			{ value: 'want-to-read', label: i18n.filterWantToRead },
		];

		for (const option of options) {
			const el = select.createEl('option', { text: option.label, value: option.value });
			el.selected = option.value === this.statusFilter;
		}

		select.addEventListener('change', () => {
			this.statusFilter = (select.value as StatusFilter) || 'all';
			void this.render();
		});

		wrap.createEl('span', {
			text: i18n.filterCount(shown, total),
			cls: 'kindle-library-filter-count',
		});
	}

	private applyFilter(books: BookCard[]): BookCard[] {
		if (this.statusFilter === 'all') return books;
		return books.filter(b => (b.status || 'read') === this.statusFilter);
	}

	private renderGrid(containerEl: HTMLElement, books: BookCard[]): void {
		const grid = containerEl.createDiv('kindle-library-grid');

		for (const book of books) {
			this.renderCard(grid, book);
		}

		this.renderAddCard(grid);
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

	private renderAddCard(gridEl: HTMLElement): void {
		const i18n = t().libraryView;
		const card = gridEl.createDiv('kindle-library-add-card');
		card.setAttribute('aria-label', i18n.addManualBtn);
		card.createDiv('kindle-library-add-card-plus').setText('+');
		card.addEventListener('click', () => {
			new ManualAddModal(this.pluginApp, this.settings).open();
		});
	}

	private loadBooks(): BookCard[] {
		const folder = this.settings.highlightsFolder;
		const files = this.app.vault.getMarkdownFiles().filter(f => {
			const parent = f.parent?.path ?? '';
			return parent === folder || f.path.startsWith(folder + '/');
		});

		const books: BookCard[] = [];

		for (const file of files) {
			// Skip internal service files used by the plugin.
			if (file.basename.startsWith('_')) continue;

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
				status: String(fm['status'] ?? 'read'),
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
