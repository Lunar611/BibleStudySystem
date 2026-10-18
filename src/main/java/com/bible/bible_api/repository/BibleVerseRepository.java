package com.bible.bible_api.repository;

import com.bible.bible_api.entity.BibleVerse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BibleVerseRepository
        extends JpaRepository<BibleVerse, Long> {

    List<BibleVerse> findByChapter_IdOrderByVerseNumberAsc(Long chapterId);
}
