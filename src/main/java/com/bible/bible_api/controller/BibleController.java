
package com.bible.bible_api.controller;

import com.bible.bible_api.dto.BibleVerseResponse;
import com.bible.bible_api.entity.BibleBook;
import com.bible.bible_api.entity.BibleChapter;
import com.bible.bible_api.entity.BibleTranslation;
import com.bible.bible_api.entity.BibleVerse;
import com.bible.bible_api.repository.BibleBookRepository;
import com.bible.bible_api.repository.BibleChapterRepository;
import com.bible.bible_api.repository.BibleTranslationRepository;
import com.bible.bible_api.repository.BibleVerseRepository;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api")
public class BibleController {

    private final BibleTranslationRepository translationRepository;
    private final BibleBookRepository bookRepository;
    private final BibleChapterRepository chapterRepository;
    private final BibleVerseRepository verseRepository;

    public BibleController(
            BibleTranslationRepository translationRepository,
            BibleBookRepository bookRepository,
            BibleChapterRepository chapterRepository,
            BibleVerseRepository verseRepository
    ) {
        this.translationRepository = translationRepository;
        this.bookRepository = bookRepository;
        this.chapterRepository = chapterRepository;
        this.verseRepository = verseRepository;
    }

    @GetMapping("/translations")
    public List<BibleTranslation> getTranslations() {
        return translationRepository.findAll();
    }

    @GetMapping("/books")
    public List<BibleBook> getBooks() {
        return bookRepository.findAllByOrderByCanonicalOrderAsc();
    }

    @GetMapping("/translations/{translation}/books/{book}/chapters")
    public List<Integer> getChapters(
            @PathVariable String translation,
            @PathVariable String book
    ) {
        List<BibleChapter> chapters =
                chapterRepository
                        .findByTranslation_AbbreviationAndBook_NameOrderByChapterNumberAsc(
                                translation,
                                book
                        );

        if (chapters.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No chapters found for this book or translation."
            );
        }

        return chapters.stream()
                .map(BibleChapter::getChapterNumber)
                .toList();
    }

    @GetMapping("/translations/{translation}/books/{book}/chapters/{chapter}")
    public List<BibleVerseResponse> getVerses(
            @PathVariable String translation,
            @PathVariable String book,
            @PathVariable Integer chapter
    ) {
        BibleChapter bibleChapter =
                chapterRepository
                        .findByTranslation_AbbreviationAndBook_NameAndChapterNumber(
                                translation,
                                book,
                                chapter
                        )
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Chapter not found."
                        ));

        List<BibleVerse> verses =
                verseRepository.findByChapter_IdOrderByVerseNumberAsc(
                        bibleChapter.getId()
                );

        return verses.stream()
                .map(verse -> new BibleVerseResponse(
                        verse.getVerseNumber(),
                        verse.getVerseText()
                ))
                .toList();
    }
}
