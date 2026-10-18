package com.bible.bible_api.dto;

import java.util.List;

public record BibleSearchPageResponse(
        List<BibleSearchResult> results,
        long totalResults,
        int currentPage,
        int pageSize,
        int totalPages
) {}
