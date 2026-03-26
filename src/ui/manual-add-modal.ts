import { App, Modal, Notice } from 'obsidian';
import { t } from '../i18n';
import { BookRegistryService } from '../services/book-registry.service';
import { GoogleBooksService } from '../services/google-books.service';
import { NoteCreatorService } from '../services/note-creator.service';
import { KindleLibrarySettings } from '../settings';
import { GoogleBookVolume, ParsedBook } from '../types';
import { DuplicateBookModal } from './duplicate-book-modal';

export class ManualAddModal extends Modal {
	private readonly googleBooks: GoogleBooksService;
	private readonly noteCreator: NoteCreatorService;
	private readonly registry: BookRegistryService;

	private resultsEl!: HTMLElement;
	private searchInput!: HTMLInputElement;

	constructor(app: App, private readonly settings: KindleLibrarySettings) {
		super(app);
		this.googleBooks = new GoogleBooksService(settings.googleApiKey || undefined);
		this.noteCreator = new NoteCreatorService(app, settings);
		this.registry = new BookRegistryService(app, settings);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('kindle-library-confirm-modal');

		this.modalEl.style.width = '600px';
		this.modalEl.style.maxWidth = '95vw';

		const i18n = t().manualAddModal;
		contentEl.createEl('h2', { text: i18n.title });

		const searchBar = contentEl.createDiv('kindle-library-search-bar');
		this.searchInput = searchBar.createEl('input', {
			type: 'text',
			cls: 'kindle-library-search-input',
			placeholder: i18n.searchPlaceholder,
		});

		const searchBtn = searchBar.createEl('button', {
			text: i18n.searchBtn,
			cls: 'kindle-library-search-btn mod-cta',
		});
		searchBtn.addEventListener('click', () => this.doSearch());

		this.searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter') this.doSearch();
		});

		contentEl.createEl('h3', { text: i18n.resultsTitle });
		this.resultsEl = contentEl.createDiv('kindle-library-candidates-list');
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async doSearch(): Promise<void> {
		const query = this.searchInput.value.trim();
		if (!query) return;

		const i18n = t().manualAddModal;
		this.resultsEl.empty();
		this.resultsEl.createEl('p', { text: i18n.searching, cls: 'kindle-library-status-msg' });

		try {
			const candidates = await this.googleBooks.searchByQuery(query);
			this.renderResults(candidates);
		} catch (err) {
			new Notice(i18n.searchFailed);
			console.error('Manual Google Books search error:', err);
			this.renderResults([]);
		}
	}

	private renderResults(candidates: GoogleBookVolume[]): void {
		this.resultsEl.empty();
		const i18n = t().manualAddModal;

		if (candidates.length === 0) {
			this.resultsEl.createEl('p', { text: i18n.noResults, cls: 'kindle-library-no-results' });
			return;
		}

		candidates.forEach(volume => {
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

			const addBtn = item.createEl('button', {
				text: i18n.addBtn,
				cls: 'kindle-library-select-btn mod-cta',
			});
			addBtn.addEventListener('click', async () => {
				await this.addBook(volume);
			});
		});
	}

	private async addBook(volume: GoogleBookVolume): Promise<void> {
		const parsedBook: ParsedBook = {
			rawId: volume.id,
			rawTitle: volume.title,
			rawAuthor: volume.authors[0] ?? '',
			highlights: [],
		};

		const exists = await this.registry.isRegistered(parsedBook);
		if (exists) {
			const dupModal = new DuplicateBookModal(this.app, parsedBook.rawTitle);
			dupModal.open();
			const action = await dupModal.waitForResult();
			if (action === 'skip') return;
		}

		await this.noteCreator.createOrUpdateNote({ book: volume, parsedBook });
		await this.registry.register(parsedBook, volume);
		new Notice(t().manualAddModal.addedNotice(volume.title));
		this.close();
	}
}
