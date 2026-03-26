import type { en } from './en';

type Translations = typeof en;

function pluralRu(n: number, one: string, few: string, many: string): string {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod100 >= 11 && mod100 <= 14) return many;
	if (mod10 === 1) return one;
	if (mod10 >= 2 && mod10 <= 4) return few;
	return many;
}

export const ru: Translations = {
	importModal: {
		title: 'Импорт выделений Kindle',
		subtitle: 'Перенесите ваши заметки и выделения в Obsidian',
		clickToSelect: 'Нажмите, чтобы выбрать ',
		importBtn: 'Импортировать →',
		noFileSelected: 'Пожалуйста, выберите файл My Clippings.txt.',
		noHighlights: 'В выбранном файле не найдено выделений.',
		foundBooks: (n: number) => `Найдено книг: ${n}. Начинаем импорт...`,
		processing: (i: number, total: number, title: string) =>
			`Обработка ${i} / ${total}: «${title}»...`,
		failedNote: (title: string, err: string) =>
			`Не удалось создать заметку для «${title}»: ${err}`,
		cancelled: (created: number) =>
			`Импорт отменён. Создано заметок до отмены: ${created}.`,
		completeEmoji: '🎉',
		completeTitle: 'Импорт завершён!',
		completeDetail: (created: number, skipped: number) => {
			const word = pluralRu(created, 'заметка', 'заметки', 'заметок');
			return skipped > 0
				? `Создано ${created} ${word}, пропущено ${skipped}`
				: `Создано ${created} ${word}`;
		},
		openFolder: (path: string) => `Открыть «${path}»`,
		completeNotice: (detail: string) => `🎉 Импорт завершён! ${detail}`,
	},
	confirmModal: {
		title: 'Поиск книги в Google Books',
		parsedTitle: (title: string) => `Название: ${title}`,
		parsedAuthor: (author: string) => `Автор: ${author}`,
		highlights: (n: number) => `Выделений: ${n}`,
		searchPlaceholder: 'Поиск в Google Books...',
		searchBtn: 'Найти',
		resultsTitle: 'Результаты:',
		searching: 'Поиск...',
		searchFailed: 'Ошибка поиска. Проверьте подключение к интернету.',
		noResults: 'Ничего не найдено. Попробуйте изменить запрос.',
		selectBestMatch: 'Выбрать (лучшее совпадение)',
		select: 'Выбрать',
		addAsIs: 'Добавить как есть',
		skipBook: 'Пропустить книгу',
		cancelImport: 'Отменить импорт',
	},
	duplicateModal: {
		title: 'Книга уже есть в библиотеке',
		message: (title: string) => `«${title}» уже есть в вашей библиотеке. Хотите обновить её?`,
		updateBtn: 'Обновить',
		skipBtn: 'Пропустить',
	},
	manualAddModal: {
		title: 'Добавить книгу вручную',
		searchPlaceholder: 'Поиск в Google Books...',
		searchBtn: 'Найти',
		resultsTitle: 'Результаты:',
		searching: 'Поиск...',
		searchFailed: 'Ошибка поиска. Проверьте подключение к интернету.',
		noResults: 'Ничего не найдено. Попробуйте изменить запрос.',
		addBtn: 'Добавить книгу',
		addedNotice: (title: string) => `Книга «${title}» добавлена в библиотеку`,
	},
	libraryView: {
		displayText: 'Библиотека Kindle',
		heading: 'Библиотека Kindle',
		addManualBtn: 'Добавить вручную',
		importBtn: 'Импорт',
		emptyText: 'Книг пока нет. Импортируйте выделения из Kindle, чтобы начать.',
		importClippingsBtn: 'Импортировать',
		statsTotal: (n: number) => `Всего: ${n}`,
		statsRead: (n: number) => `Прочитано: ${n}`,
	},
	settings: {
		heading: 'Библиотека Kindle',
		highlightsFolder: {
			name: 'Папка для заметок',
			desc: 'Папка в хранилище, где будут создаваться заметки о книгах.',
			placeholder: 'Kindle',
		},
		googleApiKey: {
			name: 'API-ключ Google Books',
			desc: 'Необязательно. Укажите ключ, чтобы избежать ограничений при получении метаданных книг.',
			placeholder: 'AIza...',
		},
		fileNameTemplate: {
			name: 'Шаблон имени файла',
			desc: 'Шаблон для имён файлов заметок. Доступные переменные: {{title}}, {{author}}.',
			placeholder: '{{title}} - {{author}}',
		},
		noteTemplate: {
			name: 'Шаблон заметки',
			desc: 'Шаблон в стиле Handlebars. Переменные: {{title}}, {{author}}, {{coverUrl}}, {{publisher}}, {{publishedDate}}, {{isbn}}, {{description}}, {{highlights}}.',
		},
		resetTemplate: 'Сбросить шаблон',
	},
	commands: {
		openLibrary: 'Открыть библиотеку Kindle',
		importClippings: 'Импортировать выделения Kindle',
		ribbonTooltip: 'Библиотека Kindle',
	},
};
