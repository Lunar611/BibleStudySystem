package com.bible.bible_api.dto;

public record BibleSearchResult(
        Long id,
        String translation,
        String book,
        Integer chapterNumber,
        Integer verseNumber,
        String verseText
) {
}