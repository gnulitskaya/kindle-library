import { moment } from 'obsidian';
import { en } from './en';
import { ru } from './ru';

type Translations = typeof en;

const translations: Record<string, Translations> = { en, ru };

export function t(): Translations {
	const lang = moment.locale().slice(0, 2);
	return translations[lang] ?? en;
}
