import { App, Modal, Notice, Setting } from 'obsidian';
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

		contentEl.createEl('h2', { text: 'Import Kindle clippings' });

		contentEl.createEl('p', {
			text: 'Select your "My Clippings.txt" file from your Kindle device.',
			cls: 'kindle-library-description',
		});

		const fileInputWrapper = contentEl.createDiv('kindle-library-file-input-wrapper');
		const fileInput = fileInputWrapper.createEl('input', {
			type: 'file',
			cls: 'kindle-library-file-input',
		});
		fileInput.accept = '.txt';

		const selectedFileLabel = fileInputWrapper.createEl('p', {
			text: 'No file selected.',
			cls: 'kindle-library-file-label',
		});

		let selectedFile: File | null = null;

		fileInput.addEventListener('change', () => {
			selectedFile = fileInput.files?.[0] ?? null;
			selectedFileLabel.setText(selectedFile ? selectedFile.name : 'No file selected.');
		});

		const statusEl = contentEl.createDiv('kindle-library-status');

		new Setting(contentEl).addButton(btn =>
			btn
				.setButtonText('Import')
				.setCta()
				.onClick(async () => {
					if (!selectedFile) {
						new Notice('Please select a My Clippings.txt file first.');
						return;
					}
					await this.runImport(selectedFile, statusEl);
				})
		);
	}

	private async runImport(file: File, statusEl: HTMLElement): Promise<void> {
		statusEl.empty();

		const content = await readFileAsText(file);
		const books = parseClippings(content);

		if (books.length === 0) {
			statusEl.createEl('p', { text: 'No highlights found in the selected file.' });
			return;
		}

		this.setStatus(statusEl, `Found ${books.length} book(s). Starting import...`);

		let created = 0;
		let skipped = 0;
		let cancelled = false;

		for (let i = 0; i < books.length; i++) {
			if (cancelled) break;

			const parsedBook: ParsedBook | undefined = books[i];
			if (!parsedBook) continue;

			this.setStatus(
				statusEl,
				`Processing ${i + 1} / ${books.length}: "${parsedBook.rawTitle}"...`
			);

			let bookVolume: GoogleBookVolume | null = null;

			try {
				const candidates = await this.googleBooks.searchBooks(
					parsedBook.rawTitle,
					parsedBook.rawAuthor
				);

				const confirmModal = new BookConfirmModal(this.app, parsedBook, candidates);
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
				console.error(`Google Books search failed for "${parsedBook.rawTitle}":`, err);
				// Continue with parsed data only
			}

			try {
				await this.noteCreator.createOrUpdateNote({
					book: bookVolume ?? parsedBookToVolume(parsedBook),
					parsedBook,
				});
				created++;
			} catch (err) {
				console.error(`Failed to create note for "${parsedBook.rawTitle}":`, err);
				this.appendError(statusEl, `Failed to create note for "${parsedBook.rawTitle}": ${String(err)}`);
				skipped++;
			}
		}

		if (cancelled) {
			this.setStatus(statusEl, `Import cancelled. Created ${created} note(s) before cancellation.`);
		} else {
			const msg = `Import complete. Created/updated ${created} note(s)${skipped > 0 ? `, skipped ${skipped}` : ''}.`;
			this.setStatus(statusEl, msg);
			new Notice(msg);
		}
	}

	private setStatus(statusEl: HTMLElement, message: string): void {
		statusEl.empty();
		statusEl.createEl('p', { text: message, cls: 'kindle-library-status-msg' });
	}

	private appendError(statusEl: HTMLElement, message: string): void {
		statusEl.createEl('p', { text: message, cls: 'kindle-library-status-error' });
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

/**
 * Builds a minimal GoogleBookVolume from parsed clippings data
 * when no Google Books match is selected.
 */
function parsedBookToVolume(parsedBook: ParsedBook): GoogleBookVolume {
	return {
		id: parsedBook.rawId,
		title: parsedBook.rawTitle,
		authors: parsedBook.rawAuthor ? [parsedBook.rawAuthor] : [],
	};
}
