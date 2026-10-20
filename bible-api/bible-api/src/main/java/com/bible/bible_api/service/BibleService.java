package com.bible.bible_api.service;

import com.bible.bible_api.dto.BibleChapterResponse;
import com.bible.bible_api.dto.BibleChapterSummary;
import com.bible.bible_api.dto.BibleSearchPageResponse;
import com.bible.bible_api.dto.BibleSearchResult;
import com.bible.bible_api.dto.BibleVerseResponse;

import com.bible.bible_api.entity.BibleBook;
import com.bible.bible_api.entity.BibleChapter;
import com.bible.bible_api.entity.BibleTranslation;
import com.bible.bible_api.entity.BibleVerse;

import com.bible.bible_api.repository.BibleBookRepository;
import com.bible.bible_api.repository.BibleChapterRepository;
import com.bible.bible_api.repository.BibleTranslationRepository;
import com.bible.bible_api.repository.BibleVerseRepository;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class BibleService {

    private final BibleBookRepository bookRepository;
    private final BibleChapterRepository chapterRepository;
    private final BibleTranslationRepository translationRepository;
    private final BibleVerseRepository verseRepository;

    public BibleService(
            BibleBookRepository bookRepository,
            BibleChapterRepository chapterRepository,
            BibleTranslationRepository translationRepository,
            BibleVerseRepository verseRepository
    ) {
        this.bookRepository = bookRepository;
        this.chapterRepository = chapterRepository;
        this.translationRepository = translationRepository;
        this.verseRepository = verseRepository;
    }

    // Get all available Bible translations
    public List<BibleTranslation> getTranslations() {
        return translationRepository.findAll();
    }

    // Get all Bible books in canonical order
    public List<BibleBook> getBooks() {
        return bookRepository.findAllByOrderByCanonicalOrderAsc();
    }

    // Get all chapters of a book
    public List<BibleChapterSummary> getChapters(
            String translation,
            String book
    ) {
        return chapterRepository
                .findByTranslation_AbbreviationAndBook_NameOrderByChapterNumberAsc(
                        translation,
                        book
                )
                .stream()
                .map(chapter -> new BibleChapterSummary(
                        chapter.getId(),
                        chapter.getChapterNumber()
                ))
                .toList();
    }

    // Get one specific chapter, including its verses
    public BibleChapterResponse getChapter(
            String translation,
            String book,
            Integer chapterNumber
    ) {
        BibleChapter chapter = chapterRepository
                .findByTranslation_AbbreviationAndBook_NameAndChapterNumber(
                        translation,
                        book,
                        chapterNumber
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Bible chapter not found"
                ));

        List<BibleVerseResponse> verses = verseRepository
                .findByChapter_IdOrderByVerseNumberAsc(chapter.getId())
                .stream()
                .map(verse -> new BibleVerseResponse(
                        verse.getId(),
                        verse.getVerseNumber(),
                        verse.getVerseText()
                ))
                .toList();

        return new BibleChapterResponse(
                chapter.getId(),
                chapter.getTranslation().getAbbreviation(),
                chapter.getBook().getName(),
                chapter.getChapterNumber(),
                verses
        );
    }

    // Get all verses belonging to a chapter
    public List<BibleVerseResponse> getVerses(Long chapterId) {
        if (!chapterRepository.existsById(chapterId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Bible chapter not found"
            );
        }

        return verseRepository
                .findByChapter_IdOrderByVerseNumberAsc(chapterId)
                .stream()
                .map(verse -> new BibleVerseResponse(
                        verse.getId(),
                        verse.getVerseNumber(),
                        verse.getVerseText()
                ))
                .toList();
    }

    // Advanced Bible search with filters and pagination
    public BibleSearchPageResponse searchVerses(
            String translation,
            String keyword,
            String bookFilter,
            boolean exactPhrase,
            int page,
            int size
    ) {
        if (translation == null || translation.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Translation is required"
            );
        }

        if (keyword == null || keyword.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Search keyword cannot be empty"
            );
        }

        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page must be non-negative and size must be between 1 and 100"
            );
        }

        String translationFilter =
                translation.trim().toLowerCase(Locale.ROOT);

        String searchText =
                keyword.trim().toLowerCase(Locale.ROOT);

        String selectedBook =
                bookFilter == null ? "" : bookFilter.trim();

        Specification<BibleVerse> specification =
                (root, query, cb) -> {

                    Join<?, ?> chapter = root.join("chapter");
                    Join<?, ?> book = chapter.join("book");
                    Join<?, ?> bibleTranslation =
                            chapter.join("translation");

                    List<Predicate> predicates = new ArrayList<>();

                    // Filter by translation
                    predicates.add(
                            cb.equal(
                                    cb.lower(
                                            bibleTranslation.get("abbreviation")
                                    ),
                                    translationFilter
                            )
                    );

                    // Optional book filter
                    if (!selectedBook.isEmpty()) {
                        predicates.add(
                                cb.equal(
                                        cb.lower(book.get("name")),
                                        selectedBook.toLowerCase(Locale.ROOT)
                                )
                        );
                    }

                    // Exact phrase or all keywords
                    if (exactPhrase) {
                        predicates.add(
                                cb.like(
                                        cb.lower(root.get("verseText")),
                                        "%" + searchText + "%"
                                )
                        );
                    } else {
                        String[] keywords = searchText.split("\\s+");

                        for (String word : keywords) {
                            predicates.add(
                                    cb.like(
                                            cb.lower(root.get("verseText")),
                                            "%" + word + "%"
                                    )
                            );
                        }
                    }

                    // Keep results in Bible order
                    if (query != null
                            && !Long.class.equals(query.getResultType())
                            && !long.class.equals(query.getResultType())) {
                        query.orderBy(
                                cb.asc(book.get("canonicalOrder")),
                                cb.asc(chapter.get("chapterNumber")),
                                cb.asc(root.get("verseNumber"))
                        );
                    }

                    return cb.and(
                            predicates.toArray(new Predicate[0])
                    );
                };

        Page<BibleVerse> resultPage = verseRepository.findAll(
                specification,
                PageRequest.of(page, size)
        );

        List<BibleSearchResult> results =
                resultPage.getContent()
                        .stream()
                        .map(verse -> new BibleSearchResult(
                                verse.getId(),
                                verse.getChapter()
                                        .getTranslation()
                                        .getAbbreviation(),
                                verse.getChapter()
                                        .getBook()
                                        .getName(),
                                verse.getChapter().getChapterNumber(),
                                verse.getVerseNumber(),
                                verse.getVerseText()
                        ))
                        .toList();

        return new BibleSearchPageResponse(
                results,
                resultPage.getTotalElements(),
                resultPage.getNumber(),
                resultPage.getSize(),
                resultPage.getTotalPages()
        );
    }
}