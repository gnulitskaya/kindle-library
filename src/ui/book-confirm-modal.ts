import { App, Modal, Notice, Setting } from 'obsidian';
import { t } from '../i18n';
import { GoogleBooksService } from '../services/google-books.service';
import { GoogleBookVolume, ParsedBook } from '../types';

export type BookConfirmResult =
	| { action: 'confirm'; book: GoogleBookVolume }
	| { action: 'skip' }
	| { action: 'cancel' };

/**
 * Shows Google Books search results for a parsed book and lets the user
 * pick the best match, search manually, skip, or cancel the entire import.
 */
export class BookConfirmModal extends Modal {
	private result: BookConfirmResult = { action: 'cancel' };
	private onResolve!: (result: BookConfirmResult) => void;

	private resultsEl!: HTMLElement;
	private actionsEl!: HTMLElement;
	private searchInput!: HTMLInputElement;

	constructor(
		app: App,
		private readonly parsedBook: ParsedBook,
		private readonly googleBooks: GoogleBooksService
	) {
		super(app);
	}

	open(): this {
		super.open();
		return this;
	}

	async waitForResult(): Promise<BookConfirmResult> {
		return new Promise(resolve => {
			this.onResolve = resolve;
		});
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('kindle-library-confirm-modal');

		this.modalEl.style.width = '660px';
		this.modalEl.style.maxWidth = '95vw';

		const i18n = t().confirmModal;

		contentEl.createEl('h2', { text: i18n.title });

		// Parsed book info
		const infoEl = contentEl.createDiv('kindle-library-parsed-info');
		infoEl.createEl('p', { text: i18n.parsedTitle(this.parsedBook.rawTitle) });
		infoEl.createEl('p', { text: i18n.parsedAuthor(this.parsedBook.rawAuthor) });
		infoEl.createEl('p', { text: i18n.highlights(this.parsedBook.highlights.length) });

		// Search bar
		const searchBar = contentEl.createDiv('kindle-library-search-bar');
		this.searchInput = searchBar.createEl('input', {
			type: 'text',
			cls: 'kindle-library-search-input',
			placeholder: i18n.searchPlaceholder,
		});
		this.searchInput.value = [this.parsedBook.rawTitle, this.parsedBook.rawAuthor]
			.filter(Boolean)
			.join(' ');

		const searchBtn = searchBar.createEl('button', {
			text: i18n.searchBtn,
			cls: 'kindle-library-search-btn mod-cta',
		});
		searchBtn.addEventListener('click', () => this.doSearch());

		this.searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter') this.doSearch();
		});

		// Results container
		contentEl.createEl('h3', { text: i18n.resultsTitle });
		this.resultsEl = contentEl.createDiv('kindle-library-candidates-list');

		// Actions container (updated after each search)
		this.actionsEl = contentEl.createDiv('kindle-library-modal-actions');

		// Initial search
		this.doSearch();
	}

	private async doSearch(): Promise<void> {
		const query = this.searchInput.value.trim();
		if (!query) return;

		const i18n = t().confirmModal;

		this.resultsEl.empty();
		this.actionsEl.empty();
		this.resultsEl.createEl('p', { text: i18n.searching, cls: 'kindle-library-status-msg' });

		let candidates: GoogleBookVolume[] = [];

		try {
			candidates = await this.googleBooks.searchByQuery(query);
		} catch (err) {
			new Notice(i18n.searchFailed);
			console.error('Google Books search error:', err);
		}

		this.renderResults(candidates);
	}

	private renderResults(candidates: GoogleBookVolume[]): void {
		this.resultsEl.empty();
		this.actionsEl.empty();

		const i18n = t().confirmModal;

		if (candidates.length === 0) {
			this.resultsEl.createEl('p', { text: i18n.noResults, cls: 'kindle-library-no-results' });
			this.renderActionButtons(null);
			return;
		}

		candidates.forEach((volume, index) => {
			const item = this.resultsEl.createDiv('kindle-library-candidate-item');

			if (volume.coverUrl) {
				const img = item.createEl('img', { cls: 'kindle-library-candidate-cover' });
				img.src = volume.coverUrl;
				img.alt = volume.title;
			} else {
				item.createDiv('kindle-library-candidate-cover-placeholder');
			}

			const meta = item.createDiv('kindle-library-candidate-meta');
			meta.createEl('strong', { text: volume.title });
			if (volume.subtitle) {
				meta.createEl('span', { text: ` — ${volume.subtitle}`, cls: 'kindle-library-subtitle' });
			}
			meta.createEl('p', { text: volume.authors.join(', '), cls: 'kindle-library-authors' });
			if (volume.publisher) {
				meta.createEl('p', {
					text: `${volume.publisher}${volume.publishedDate ? ', ' + volume.publishedDate : ''}`,
					cls: 'kindle-library-publisher',
				});
			}

			const selectBtn = item.createEl('button', {
				text: index === 0 ? i18n.selectBestMatch : i18n.select,
				cls: 'kindle-library-select-btn mod-cta',
			});
			selectBtn.addEventListener('click', () => {
				this.result = { action: 'confirm', book: volume };
				this.onResolve(this.result);
				this.close();
			});
		});

		this.renderActionButtons(candidates[0] ?? null);
	}

	private renderActionButtons(bestMatch: GoogleBookVolume | null): void {
		this.actionsEl.empty();

		const i18n = t().confirmModal;

		if (bestMatch) {
			new Setting(this.actionsEl)
				.addButton(btn =>
					btn.setButtonText(i18n.addAsIs).onClick(() => {
						this.result = { action: 'skip' };
						this.onResolve(this.result);
						this.close();
					})
				)
				.addButton(btn =>
					btn
						.setButtonText(i18n.cancelImport)
						.setWarning()
						.onClick(() => {
							this.result = { action: 'cancel' };
							this.onResolve(this.result);
							this.close();
						})
				);
		} else {
			new Setting(this.actionsEl)
				.addButton(btn =>
					btn
						.setButtonText(i18n.addAsIs)
						.setCta()
						.onClick(() => {
							this.result = { action: 'skip' };
							this.onResolve(this.result);
							this.close();
						})
				)
				.addButton(btn =>
					btn
						.setButtonText(i18n.cancelImport)
						.setWarning()
						.onClick(() => {
							this.result = { action: 'cancel' };
							this.onResolve(this.result);
							this.close();
						})
				);
		}
	}

	onClose(): void {
		this.contentEl.empty();
		if (this.onResolve) {
			this.onResolve(this.result);
		}
	}
}
