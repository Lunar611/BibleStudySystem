package com.bible.bible_api.service;

import com.bible.bible_api.dto.BibleChapterResponse;
import com.bible.bible_api.dto.BibleChapterSummary;
import com.bible.bible_api.dto.BibleSearchResult;
import com.bible.bible_api.dto.BibleVerseResponse;

import com.bible.bible_api.entity.BibleBook;
import com.bible.bible_api.entity.BibleChapter;
import com.bible.bible_api.entity.BibleTranslation;

import com.bible.bible_api.repository.BibleBookRepository;
import com.bible.bible_api.repository.BibleChapterRepository;
import com.bible.bible_api.repository.BibleTranslationRepository;
import com.bible.bible_api.repository.BibleVerseRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

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

    // Get all chapters of a book using DTOs
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

    // Get one specific chapter as a DTO
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

        return new BibleChapterResponse(
                chapter.getId(),
                chapter.getTranslation().getAbbreviation(),
                chapter.getBook().getName(),
                chapter.getChapterNumber()
        );
    }

    // Get all verses belonging to a chapter using DTOs
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

    // Search Bible verses by keyword or phrase
    public List<BibleSearchResult> searchVerses(
            String translation,
            String keyword
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

        return verseRepository
                .searchVerses(
                        translation.trim(),
                        keyword.trim(),
                        PageRequest.of(0, 100)
                )
                .stream()
                .map(verse -> new BibleSearchResult(
                        verse.getId(),
                        verse.getChapter()
                                .getTranslation()
                                .getAbbreviation(),
                        verse.getChapter().getBook().getName(),
                        verse.getChapter().getChapterNumber(),
                        verse.getVerseNumber(),
                        verse.getVerseText()
                ))
                .toList();
    }
}