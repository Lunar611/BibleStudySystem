
package com.bible.bible_api.repository;

import com.bible.bible_api.entity.BibleVerse;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface BibleVerseRepository
        extends JpaRepository<BibleVerse, Long>,
        JpaSpecificationExecutor<BibleVerse> {

    // Get all verses in a chapter, ordered by verse number
    List<BibleVerse> findByChapter_IdOrderByVerseNumberAsc(Long chapterId);

    // Get all existing verses in a chapter for the importer
    List<BibleVerse> findAllByChapter_Id(Long chapterId);

    // Check whether a verse already exists in a chapter
    boolean existsByChapter_IdAndVerseNumber(
            Long chapterId,
            Integer verseNumber
    );
}
