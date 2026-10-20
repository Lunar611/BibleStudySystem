
package com.bible.bible_api.dto;

import java.util.List;

public record BibleChapterResponse(
        Long id,
        String translation,
        String book,
        Integer chapterNumber,
        List<BibleVerseResponse> verses
) {
}
