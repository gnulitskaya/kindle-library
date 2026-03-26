import { App, Modal } from 'obsidian';
import { t } from '../i18n';

export type DuplicateAction = 'update' | 'skip';

export class DuplicateBookModal extends Modal {
	private resolve: ((action: DuplicateAction) => void) | null = null;

	constructor(app: App, private readonly bookTitle: string) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('kindle-library-duplicate-modal');

		const i18n = t().duplicateModal;

		contentEl.createEl('h2', { text: i18n.title });
		contentEl.createEl('p', { text: i18n.message(this.bookTitle), cls: 'kindle-library-duplicate-msg' });

		const footer = contentEl.createDiv('kindle-library-duplicate-footer');

		const updateBtn = footer.createEl('button', {
			text: i18n.updateBtn,
			cls: 'mod-cta',
		});
		updateBtn.addEventListener('click', () => this.complete('update'));

		const skipBtn = footer.createEl('button', { text: i18n.skipBtn });
		skipBtn.addEventListener('click', () => this.complete('skip'));
	}

	onClose(): void {
		this.contentEl.empty();
		this.resolve?.('skip');
		this.resolve = null;
	}

	waitForResult(): Promise<DuplicateAction> {
		return new Promise(resolve => {
			this.resolve = resolve;
		});
	}

	private complete(action: DuplicateAction): void {
		const resolve = this.resolve;
		this.resolve = null;
		this.close();
		resolve?.(action);
	}
}
