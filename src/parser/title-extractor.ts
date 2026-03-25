export interface ExtractedBookInfo {
	title: string;
	author: string;
}

/**
 * Extracts a clean title and author from the raw Kindle book identifier line.
 *
 * Kindle clippings use the source file name as the book identifier, which can be:
 * - "[Series] Title{Author_info}(year, publisher){id} libgen.li (Author Name)"
 * - "Filename_underscored_libgen_li (Author Name)"
 * - "Filename.fb2 (Author Name)"
 * - "Proper Book Title (Author Name)"
 *
 * In all cases, the actual author is always in the last parentheses at the end.
 */
export function extractBookInfo(rawId: string): ExtractedBookInfo {
	const cleaned = rawId.replace(/^\uFEFF/, '').trim();

	const author = extractAuthor(cleaned);
	const title = extractTitle(cleaned, author);

	return { title, author };
}

function extractAuthor(rawId: string): string {
	const match = rawId.match(/\(([^)]+)\)\s*$/);
	if (!match || match[1] == null) return rawId;
	return match[1].trim();
}

function extractTitle(rawId: string, author: string): string {
	// Remove the author suffix "(Author)" at the end
	let withoutAuthor = rawId.replace(/\s*\([^)]+\)\s*$/, '').trim();

	// Remove libgen suffixes: {id}, (year, publisher), libgen.li, .fb2 extension, etc.
	withoutAuthor = withoutAuthor
		.replace(/\{[^}]*\}/g, '')           // remove {...}
		.replace(/\(\d{4},[^)]*\)/g, '')      // remove (2024, Publisher)
		.replace(/libgen\.li/gi, '')          // remove libgen.li
		.replace(/\.\w{2,4}$/i, '')           // remove file extension
		.replace(/\.\d+$/, '')                // remove numeric IDs like .328260
		.trim();

	// Try to extract a clean title from "[Series] Title" pattern
	const seriesMatch = withoutAuthor.match(/^\[[^\]]+\]\s*(.+)/);
	if (seriesMatch?.[1] != null) {
		withoutAuthor = seriesMatch[1].trim();
	}

	// Remove author name that may be embedded in the title (common in libgen filenames)
	// e.g. "Психология_влияния_Андерсон,_Крис" → remove the "_Андерсон,_Крис" suffix
	if (author) {
		// Try to remove a transliterated or original surname from end of filename
		const authorParts = author.split(/\s+/);
		for (const part of authorParts) {
			if (part.length > 3) {
				// Build a regex that matches the part possibly with underscores and variants
				const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				withoutAuthor = withoutAuthor
					.replace(new RegExp('[,_\\s]+' + escaped + '[,_\\s]*$', 'i'), '')
					.trim();
			}
		}
	}

	// Replace underscores and hyphens used as word separators with spaces
	const title = withoutAuthor
		.replace(/_/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();

	return title || rawId;
}
