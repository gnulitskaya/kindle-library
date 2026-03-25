import { GoogleBookVolume } from '../types';

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

interface GoogleBooksApiResponse {
	totalItems: number;
	items?: GoogleBooksApiItem[];
}

interface GoogleBooksApiItem {
	id: string;
	volumeInfo: {
		title?: string;
		subtitle?: string;
		authors?: string[];
		publisher?: string;
		publishedDate?: string;
		description?: string;
		pageCount?: number;
		categories?: string[];
		imageLinks?: {
			thumbnail?: string;
			smallThumbnail?: string;
		};
		industryIdentifiers?: Array<{
			type: string;
			identifier: string;
		}>;
	};
}

export class GoogleBooksService {
	constructor(private readonly apiKey?: string) {}

	async searchBooks(title: string, author: string): Promise<GoogleBookVolume[]> {
		const query = [title, author].filter(Boolean).join(' ').trim();
		return this.searchByQuery(query);
	}

	async searchByQuery(query: string): Promise<GoogleBookVolume[]> {
		if (!query.trim()) return [];

		const url = buildUrl(query.trim(), this.apiKey);

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
		}

		const data = (await response.json()) as GoogleBooksApiResponse;
		if (!data.items || data.items.length === 0) return [];

		return data.items.map(mapToVolume);
	}
}

function buildUrl(query: string, apiKey?: string): string {
	const params = new URLSearchParams({ q: query, maxResults: '5' });
	if (apiKey) params.set('key', apiKey);
	return `${BASE_URL}?${params.toString()}`;
}

function mapToVolume(item: GoogleBooksApiItem): GoogleBookVolume {
	const info = item.volumeInfo;

	const isbn10 = info.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier;
	const isbn13 = info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier;

	// Use large thumbnail and remove zoom/edge curl parameters
	const rawCover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
	const coverUrl = rawCover
		? rawCover.replace(/&edge=curl/g, '').replace(/^http:/, 'https:')
		: undefined;

	return {
		id: item.id,
		title: info.title ?? '',
		subtitle: info.subtitle,
		authors: info.authors ?? [],
		publisher: info.publisher,
		publishedDate: info.publishedDate,
		description: info.description,
		isbn10,
		isbn13,
		coverUrl,
		pageCount: info.pageCount,
		categories: info.categories,
	};
}
