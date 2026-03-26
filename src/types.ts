export type BookStatus = 'read' | 'in-progress' | 'want-to-read';

export interface Highlight {
	text: string;
	page: number | null;
	locationStart: number | null;
	locationEnd: number | null;
	addedAt: Date | null;
	type: 'highlight' | 'note' | 'bookmark';
}

export interface ParsedBook {
	rawId: string;
	rawTitle: string;
	rawAuthor: string;
	highlights: Highlight[];
}

export interface GoogleBookVolume {
	id: string;
	title: string;
	subtitle?: string;
	authors: string[];
	publisher?: string;
	publishedDate?: string;
	description?: string;
	isbn10?: string;
	isbn13?: string;
	coverUrl?: string;
	pageCount?: number;
	categories?: string[];
}

export interface BookNote {
	book: GoogleBookVolume;
	parsedBook: ParsedBook;
}
