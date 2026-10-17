package com.bible.bible_api.dto;

public record BibleChapterResponse(
        Long id,
        String translation,
        String book,
        Integer chapterNumber
) {
}