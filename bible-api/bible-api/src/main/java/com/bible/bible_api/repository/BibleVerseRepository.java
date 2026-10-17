package com.bible.bible_api.repository;

import com.bible.bible_api.entity.BibleVerse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BibleVerseRepository
        extends JpaRepository<BibleVerse, Long> {

    List<BibleVerse> findByChapter_IdOrderByVerseNumberAsc(Long chapterId);

    boolean existsByChapter_IdAndVerseNumber(
            Long chapterId,
            Integer verseNumber
    );

    @Query("""
        SELECT v
        FROM BibleVerse v
        JOIN v.chapter c
        JOIN c.book b
        JOIN c.translation t
        WHERE t.abbreviation = :translation
        AND LOWER(v.verseText) LIKE
            LOWER(CONCAT('%', :keyword, '%'))
        ORDER BY b.canonicalOrder ASC,
                 c.chapterNumber ASC,
                 v.verseNumber ASC
        """)
    List<BibleVerse> searchVerses(
            @Param("translation") String translation,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}