package com.bible.bible_api.dto;

public record BibleVerseResponse(
        Long id,
        Integer verseNumber,
        String verseText
) {}