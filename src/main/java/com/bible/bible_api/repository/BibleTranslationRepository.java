package com.bible.bible_api.repository;

import com.bible.bible_api.entity.BibleTranslation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BibleTranslationRepository
        extends JpaRepository<BibleTranslation, Long> {
}
