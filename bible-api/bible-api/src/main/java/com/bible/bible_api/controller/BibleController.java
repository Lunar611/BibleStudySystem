
package com.bible.bible_api.controller;

import com.bible.bible_api.dto.BibleSearchPageResponse;
import com.bible.bible_api.dto.BibleChapterResponse;
import com.bible.bible_api.dto.BibleChapterSummary;
import com.bible.bible_api.dto.BibleSearchResult;
import com.bible.bible_api.dto.BibleVerseResponse;

import com.bible.bible_api.entity.BibleBook;
import com.bible.bible_api.entity.BibleTranslation;

import com.bible.bible_api.service.BibleService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "https://word-and-wisdom.onrender.com"
})
public class BibleController {

    private final BibleService bibleService;

    public BibleController(BibleService bibleService) {
        this.bibleService = bibleService;
    }

    // GET /api/translations
    @GetMapping("/translations")
    public List<BibleTranslation> getTranslations() {
        return bibleService.getTranslations();
    }

    // GET /api/books
    @GetMapping("/books")
    public List<BibleBook> getBooks() {
        return bibleService.getBooks();
    }

    // GET /api/translations/KJV/books/Genesis/chapters
    @GetMapping("/translations/{translation}/books/{book}/chapters")
    public List<BibleChapterSummary> getChapters(
            @PathVariable String translation,
            @PathVariable String book
    ) {
        return bibleService.getChapters(translation, book);
    }

    // GET /api/translations/KJV/books/Genesis/chapters/1
    @GetMapping("/translations/{translation}/books/{book}/chapters/{chapterNumber}")
    public BibleChapterResponse getChapter(
            @PathVariable String translation,
            @PathVariable String book,
            @PathVariable Integer chapterNumber
    ) {
        return bibleService.getChapter(
                translation,
                book,
                chapterNumber
        );
    }

    // GET /api/chapters/1/verses
    @GetMapping("/chapters/{chapterId}/verses")
    public List<BibleVerseResponse> getVerses(
            @PathVariable Long chapterId
    ) {
        return bibleService.getVerses(chapterId);
    }

    // GET /api/search?translation=KJV&query=love
    @GetMapping("/search")
    public BibleSearchPageResponse searchVerses(
            @RequestParam(defaultValue = "KJV") String translation,
            @RequestParam(name = "query") String keyword,
            @RequestParam(defaultValue = "") String book,
            @RequestParam(defaultValue = "false") boolean exactPhrase,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return bibleService.searchVerses(
                translation,
                keyword,
                book,
                exactPhrase,
                page,
                size
        );
    }
}
