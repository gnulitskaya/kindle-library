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

		// Hero section
		const hero = contentEl.createDiv('kindle-library-hero');
		hero.innerHTML = KINDLE_SVG;
		hero.createEl('h2', { text: 'Import Kindle clippings' });
		hero.createEl('p', {
			text: 'Bring your highlights and notes into Obsidian',
			cls: 'kindle-library-hero-subtitle',
		});

		// File drop zone
		let selectedFile: File | null = null;

		const dropzone = contentEl.createDiv('kindle-library-dropzone');
		const fileIconEl = dropzone.createDiv('kindle-library-dropzone-icon');
		fileIconEl.innerHTML = FILE_SVG;

		const dropzoneLabel = dropzone.createDiv('kindle-library-dropzone-label');
		dropzoneLabel.createEl('span', {
			text: 'Click to select ',
			cls: 'kindle-library-dropzone-hint',
		});
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

		const statusEl = contentEl.createDiv('kindle-library-status');

		new Setting(contentEl).addButton(btn =>
			btn
				.setButtonText('Import →')
				.setCta()
				.onClick(async () => {
					if (!selectedFile) {
						new Notice('Please select a My Clippings.txt file first.');
						dropzone.addClass('is-error');
						setTimeout(() => dropzone.removeClass('is-error'), 1200);
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
				this.appendError(statusEl, `Failed to create note for "${parsedBook.rawTitle}": ${String(err)}`);
				skipped++;
			}
		}

		if (cancelled) {
			this.setStatus(statusEl, `Import cancelled. Created ${created} note(s) before cancellation.`);
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
		statusEl.empty();
		statusEl.addClass('kindle-library-status--complete');

		const wrap = statusEl.createDiv('kindle-library-complete');
		wrap.createDiv('kindle-library-complete-emoji').setText('🎉');
		wrap.createEl('h3', { text: 'Import complete!', cls: 'kindle-library-complete-title' });

		const detail = skipped > 0
			? `Created ${created} note${created !== 1 ? 's' : ''}, skipped ${skipped}`
			: `Created ${created} note${created !== 1 ? 's' : ''}`;
		wrap.createEl('p', { text: detail, cls: 'kindle-library-complete-detail' });

		const folderPath = this.settings.highlightsFolder;
		const folderBtn = wrap.createEl('button', {
			text: `Open "${folderPath}"`,
			cls: 'kindle-library-complete-open mod-cta',
		});
		folderBtn.addEventListener('click', () => {
			const folder = this.app.vault.getAbstractFileByPath(folderPath);
			if (folder) {
				this.app.workspace.revealLeaf(
					this.app.workspace.getLeaf(false)
				);
			}
			this.close();
		});

		new Notice(`🎉 Import complete! ${detail}`);
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

const KINDLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none" aria-hidden="true">
  <rect x="12" y="8" width="44" height="58" rx="4" fill="currentColor" opacity="0.08"/>
  <rect x="14" y="10" width="40" height="54" rx="3" stroke="currentColor" stroke-width="2" opacity="0.4"/>
  <line x1="22" y1="24" x2="46" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
  <line x1="22" y1="32" x2="46" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
  <line x1="22" y1="40" x2="38" y2="40" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
  <rect x="46" y="6" width="14" height="22" rx="2" fill="currentColor" opacity="0.12"/>
  <rect x="47" y="7" width="12" height="20" rx="1.5" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  <path d="M50 10h6M50 14h6M50 18h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
  <circle cx="56" cy="58" r="10" fill="currentColor" opacity="0.1"/>
  <path d="M52 58l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
</svg>`;

const FILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
  <line x1="16" y1="13" x2="8" y2="13"/>
  <line x1="16" y1="17" x2="8" y2="17"/>
  <polyline points="10 9 9 9 8 9"/>
</svg>`;
