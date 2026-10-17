package com.bible.bible_api.repository;

import com.bible.bible_api.entity.BibleTranslation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BibleTranslationRepository
        extends JpaRepository<BibleTranslation, Long> {

    Optional<BibleTranslation> findByAbbreviation(String abbreviation);
}