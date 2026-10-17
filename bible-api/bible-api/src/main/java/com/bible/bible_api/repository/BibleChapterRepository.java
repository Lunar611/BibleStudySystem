package com.bible.bible_api.repository;

import com.bible.bible_api.entity.BibleChapter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BibleChapterRepository
        extends JpaRepository<BibleChapter, Long> {

    Optional<BibleChapter>
    findByTranslation_AbbreviationAndBook_NameAndChapterNumber(
            String abbreviation,
            String bookName,
            Integer chapterNumber
    );

    List<BibleChapter>
    findByTranslation_AbbreviationAndBook_NameOrderByChapterNumberAsc(
            String abbreviation,
            String bookName
    );
}