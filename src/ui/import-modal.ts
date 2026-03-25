import { App, Modal, Notice } from 'obsidian';
import { t } from '../i18n';
import { parseClippings } from '../parser/clippings-parser';
import { GoogleBooksService } from '../services/google-books.service';
import { NoteCreatorService } from '../services/note-creator.service';
import { KindleLibrarySettings } from '../settings';
import { GoogleBookVolume, ParsedBook } from '../types';
import { BookConfirmModal } from './book-confirm-modal';


export class ImportModal extends Modal {
	private googleBooks: GoogleBooksService;
	private noteCreator: NoteCreatorService;

	constructor(app: App, private readonly settings: KindleLibrarySettings) {
		super(app);
		this.googleBooks = new GoogleBooksService(settings.googleApiKey || undefined);
		this.noteCreator = new NoteCreatorService(app, settings);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('kindle-library-import-modal');

		const i18n = t().importModal;

		// Hero
		const hero = contentEl.createDiv('kindle-library-hero');
		hero.createDiv('kindle-library-hero-emoji').setText('📚');
		hero.createEl('h2', { text: i18n.title });
		hero.createEl('p', { text: i18n.subtitle, cls: 'kindle-library-hero-subtitle' });

		// File drop zone
		let selectedFile: File | null = null;

		const dropzone = contentEl.createDiv('kindle-library-dropzone');
		dropzone.createDiv('kindle-library-dropzone-icon').setText('📄');

		const dropzoneLabel = dropzone.createDiv('kindle-library-dropzone-label');
		dropzoneLabel.createEl('span', { text: i18n.clickToSelect, cls: 'kindle-library-dropzone-hint' });
		dropzoneLabel.createEl('span', { text: 'My Clippings.txt', cls: 'kindle-library-dropzone-filename' });

		const fileInput = dropzone.createEl('input', { type: 'file', cls: 'kindle-library-file-input-hidden' });
		fileInput.accept = '.txt';

		dropzone.addEventListener('click', () => fileInput.click());

		fileInput.addEventListener('change', () => {
			selectedFile = fileInput.files?.[0] ?? null;
			if (selectedFile) {
				dropzoneLabel.empty();
				dropzoneLabel.createEl('span', { text: selectedFile.name, cls: 'kindle-library-dropzone-selected' });
				dropzone.addClass('is-selected');
			}
		});

		// Status — скрыт пока не начался импорт
		const statusEl = contentEl.createDiv('kindle-library-status');
		statusEl.style.display = 'none';

		// Import button
		const footer = contentEl.createDiv('kindle-library-import-footer');
		const importBtn = footer.createEl('button', { text: i18n.importBtn, cls: 'kindle-library-import-btn mod-cta' });
		importBtn.addEventListener('click', async () => {
			if (!selectedFile) {
				new Notice(i18n.noFileSelected);
				dropzone.addClass('is-error');
				setTimeout(() => dropzone.removeClass('is-error'), 1200);
				return;
			}
			statusEl.style.display = '';
			await this.runImport(selectedFile, statusEl);
		});
	}

	private async runImport(file: File, statusEl: HTMLElement): Promise<void> {
		const i18n = t().importModal;
		statusEl.empty();

		const content = await readFileAsText(file);
		const books = parseClippings(content);

		if (books.length === 0) {
			statusEl.createEl('p', { text: i18n.noHighlights });
			return;
		}

		this.setStatus(statusEl, i18n.foundBooks(books.length));

		let created = 0;
		let skipped = 0;
		let cancelled = false;

		for (let i = 0; i < books.length; i++) {
			if (cancelled) break;

			const parsedBook: ParsedBook | undefined = books[i];
			if (!parsedBook) continue;

			this.setStatus(statusEl, i18n.processing(i + 1, books.length, parsedBook.rawTitle));

			let bookVolume: GoogleBookVolume | null = null;

			try {
				const confirmModal = new BookConfirmModal(this.app, parsedBook, this.googleBooks);
				confirmModal.open();
				const result = await confirmModal.waitForResult();

				if (result.action === 'cancel') {
					cancelled = true;
					break;
				}

				if (result.action === 'confirm') {
					bookVolume = result.book;
				}
			} catch (err) {
				console.error(`BookConfirmModal error for "${parsedBook.rawTitle}":`, err);
			}

			try {
				await this.noteCreator.createOrUpdateNote({
					book: bookVolume ?? parsedBookToVolume(parsedBook),
					parsedBook,
				});
				created++;
			} catch (err) {
				console.error(`Failed to create note for "${parsedBook.rawTitle}":`, err);
				this.appendError(statusEl, i18n.failedNote(parsedBook.rawTitle, String(err)));
				skipped++;
			}
		}

		if (cancelled) {
			this.setStatus(statusEl, i18n.cancelled(created));
		} else {
			this.showComplete(statusEl, created, skipped);
		}
	}

	private setStatus(statusEl: HTMLElement, message: string): void {
		statusEl.empty();
		statusEl.createEl('p', { text: message, cls: 'kindle-library-status-msg' });
	}

	private appendError(statusEl: HTMLElement, message: string): void {
		statusEl.createEl('p', { text: message, cls: 'kindle-library-status-error' });
	}

	private showComplete(statusEl: HTMLElement, created: number, skipped: number): void {
		const i18n = t().importModal;
		statusEl.empty();
		statusEl.addClass('kindle-library-status--complete');

		const wrap = statusEl.createDiv('kindle-library-complete');
		wrap.createDiv('kindle-library-complete-emoji').setText(i18n.completeEmoji);
		wrap.createEl('h3', { text: i18n.completeTitle, cls: 'kindle-library-complete-title' });

		const detail = i18n.completeDetail(created, skipped);
		wrap.createEl('p', { text: detail, cls: 'kindle-library-complete-detail' });

		const folderPath = this.settings.highlightsFolder;
		const folderBtn = wrap.createEl('button', {
			text: i18n.openFolder(folderPath),
			cls: 'kindle-library-complete-open mod-cta',
		});
		folderBtn.addEventListener('click', () => {
			const folder = this.app.vault.getAbstractFileByPath(folderPath);
			if (folder) {
				this.app.workspace.revealLeaf(this.app.workspace.getLeaf(false));
			}
			this.close();
		});

		new Notice(i18n.completeNotice(detail));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file, 'utf-8');
	});
}

function parsedBookToVolume(parsedBook: ParsedBook): GoogleBookVolume {
	return {
		id: parsedBook.rawId,
		title: parsedBook.rawTitle,
		authors: parsedBook.rawAuthor ? [parsedBook.rawAuthor] : [],
	};
}

