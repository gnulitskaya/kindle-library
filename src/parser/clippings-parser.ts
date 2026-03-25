import { Highlight, ParsedBook } from '../types';
import { extractBookInfo } from './title-extractor';

const ENTRY_SEPARATOR = '==========';

/**
 * Parses the full content of a Kindle "My Clippings.txt" file into a list of ParsedBook objects.
 * Duplicate highlights (identical text for the same book) are deduplicated.
 */
export function parseClippings(content: string): ParsedBook[] {
	const entries = content.split(ENTRY_SEPARATOR).map(e => e.trim()).filter(Boolean);
	const bookMap = new Map<string, ParsedBook>();

	for (const entry of entries) {
		const parsed = parseEntry(entry);
		if (!parsed) continue;

		const { rawId, highlight } = parsed;

		if (!bookMap.has(rawId)) {
			const { title, author } = extractBookInfo(rawId);
			bookMap.set(rawId, {
				rawId,
				rawTitle: title,
				rawAuthor: author,
				highlights: [],
			});
		}

		const book = bookMap.get(rawId)!;
		// Deduplicate by text content
		const alreadyExists = book.highlights.some(h => h.text === highlight.text);
		if (!alreadyExists) {
			book.highlights.push(highlight);
		}
	}

	return Array.from(bookMap.values());
}

interface EntryParseResult {
	rawId: string;
	highlight: Highlight;
}

function parseEntry(entry: string): EntryParseResult | null {
	const lines = entry.split('\n').map(l => l.replace(/^\uFEFF/, ''));

	if (lines.length < 2) return null;

	const firstLine = lines[0];
	const secondLine = lines[1];
	if (firstLine === undefined || secondLine === undefined) return null;

	const rawId = firstLine.trim();
	if (!rawId) return null;

	const metaLine = secondLine.trim();
	const highlight = parseMetaAndText(metaLine, lines.slice(2));

	if (!highlight) return null;

	return { rawId, highlight };
}

function parseMetaAndText(metaLine: string, remainingLines: string[]): Highlight | null {
	const type = detectType(metaLine);

	// Extract page
	const pageMatch = metaLine.match(/page\s+(\d+)/i);
	const page = pageMatch?.[1] != null ? parseInt(pageMatch[1], 10) : null;

	// Extract location range
	const locationMatch = metaLine.match(/[Ll]ocation\s+(\d+)[-–](\d+)/);
	const locationStart = locationMatch?.[1] != null ? parseInt(locationMatch[1], 10) : null;
	const locationEnd = locationMatch?.[2] != null ? parseInt(locationMatch[2], 10) : null;

	// Extract date
	const dateMatch = metaLine.match(/Added on (.+)$/i);
	let addedAt: Date | null = null;
	if (dateMatch?.[1] != null) {
		const parsed = new Date(dateMatch[1].trim());
		if (!isNaN(parsed.getTime())) {
			addedAt = parsed;
		}
	}

	// Text is everything after the blank line following the meta line
	const textLines = remainingLines
		.join('\n')
		.replace(/^\s*\n/, '')
		.trim();

	if (!textLines && type === 'bookmark') {
		return { text: '', page, locationStart, locationEnd, addedAt, type };
	}

	if (!textLines) return null;

	return {
		text: textLines,
		page,
		locationStart,
		locationEnd,
		addedAt,
		type,
	};
}

function detectType(metaLine: string): Highlight['type'] {
	if (/Your Note/i.test(metaLine)) return 'note';
	if (/Your Bookmark/i.test(metaLine)) return 'bookmark';
	return 'highlight';
}
