import { App, Modal, Setting } from 'obsidian';
import { GoogleBookVolume, ParsedBook } from '../types';

export type BookConfirmResult =
	| { action: 'confirm'; book: GoogleBookVolume }
	| { action: 'skip' }
	| { action: 'cancel' };

/**
 * Shows Google Books search results for a parsed book and lets the user
 * pick the best match, skip, or cancel the entire import.
 */
export class BookConfirmModal extends Modal {
	private result: BookConfirmResult = { action: 'cancel' };
	private onResolve!: (result: BookConfirmResult) => void;

	constructor(
		app: App,
		private readonly parsedBook: ParsedBook,
		private readonly candidates: GoogleBookVolume[]
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

		contentEl.createEl('h2', { text: 'Match book to Google Books' });

		const infoEl = contentEl.createDiv('kindle-library-parsed-info');
		infoEl.createEl('p', {
			text: `Parsed title: ${this.parsedBook.rawTitle}`,
		});
		infoEl.createEl('p', {
			text: `Parsed author: ${this.parsedBook.rawAuthor}`,
		});
		infoEl.createEl('p', {
			text: `Highlights: ${this.parsedBook.highlights.length}`,
		});

		if (this.candidates.length === 0) {
			contentEl.createEl('p', {
				text: 'No results found on Google Books. The note will be created with parsed data.',
				cls: 'kindle-library-no-results',
			});
			this.renderActionButtons(contentEl, null);
			return;
		}

		contentEl.createEl('h3', { text: 'Select the best match:' });

		const listEl = contentEl.createDiv('kindle-library-candidates-list');

		this.candidates.forEach((volume, index) => {
			const item = listEl.createDiv('kindle-library-candidate-item');

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
				meta.createEl('p', { text: `${volume.publisher}${volume.publishedDate ? ', ' + volume.publishedDate : ''}`, cls: 'kindle-library-publisher' });
			}

			new Setting(item).addButton(btn =>
				btn
					.setButtonText(index === 0 ? 'Select (best match)' : 'Select')
					.setCta()
					.onClick(() => {
						this.result = { action: 'confirm', book: volume };
						this.onResolve(this.result);
						this.close();
					})
			);
		});

		this.renderActionButtons(contentEl, this.candidates[0] ?? null);
	}

	private renderActionButtons(containerEl: HTMLElement, bestMatch: GoogleBookVolume | null): void {
		const actions = containerEl.createDiv('kindle-library-modal-actions');

		if (bestMatch) {
			new Setting(actions)
				.addButton(btn =>
					btn
						.setButtonText('Use best match')
						.setCta()
						.onClick(() => {
							this.result = { action: 'confirm', book: bestMatch };
							this.onResolve(this.result);
							this.close();
						})
				)
				.addButton(btn =>
					btn
						.setButtonText('Skip this book')
						.onClick(() => {
							this.result = { action: 'skip' };
							this.onResolve(this.result);
							this.close();
						})
				)
				.addButton(btn =>
					btn
						.setButtonText('Cancel import')
						.setWarning()
						.onClick(() => {
							this.result = { action: 'cancel' };
							this.onResolve(this.result);
							this.close();
						})
				);
		} else {
			new Setting(actions)
				.addButton(btn =>
					btn
						.setButtonText('Create note without metadata')
						.setCta()
						.onClick(() => {
							this.result = { action: 'skip' };
							this.onResolve(this.result);
							this.close();
						})
				)
				.addButton(btn =>
					btn
						.setButtonText('Cancel import')
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
		// If closed without resolving (e.g. by pressing Escape), resolve as cancel
		if (this.onResolve) {
			this.onResolve(this.result);
		}
	}
}
