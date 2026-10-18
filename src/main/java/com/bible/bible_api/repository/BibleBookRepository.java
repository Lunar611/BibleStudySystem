package com.bible.bible_api.repository;

import com.bible.bible_api.entity.BibleBook;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BibleBookRepository
        extends JpaRepository<BibleBook, Long> {

    List<BibleBook> findAllByOrderByCanonicalOrderAsc();
}
