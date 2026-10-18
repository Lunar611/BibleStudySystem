package com.bible.bible_api.repository;

import com.bible.bible_api.entity.BibleVerse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface BibleVerseRepository
        extends JpaRepository<BibleVerse, Long>,
        JpaSpecificationExecutor<BibleVerse> {

    List<BibleVerse> findByChapter_IdOrderByVerseNumberAsc(Long chapterId);

    boolean existsByChapter_IdAndVerseNumber(
            Long chapterId,
            Integer verseNumber
    );
}
