
package com.bible.bible_api.service;

import com.bible.bible_api.entity.BibleChapter;
import com.bible.bible_api.entity.BibleTranslation;
import com.bible.bible_api.entity.BibleVerse;
import com.bible.bible_api.repository.BibleChapterRepository;
import com.bible.bible_api.repository.BibleTranslationRepository;
import com.bible.bible_api.repository.BibleVerseRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.InputStream;
import java.util.HashSet;
import java.util.Set;

@Component
public class BibleImporter implements CommandLineRunner {

    private final BibleTranslationRepository translationRepository;
    private final BibleChapterRepository chapterRepository;
    private final BibleVerseRepository verseRepository;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;

    @Value("${bible.import.enabled:false}")
    private boolean importEnabled;

    public BibleImporter(
            BibleTranslationRepository translationRepository,
            BibleChapterRepository chapterRepository,
            BibleVerseRepository verseRepository,
            ObjectMapper objectMapper,
            TransactionTemplate transactionTemplate
    ) {
        this.translationRepository = translationRepository;
        this.chapterRepository = chapterRepository;
        this.verseRepository = verseRepository;
        this.objectMapper = objectMapper;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!importEnabled) {
            System.out.println("KJV import disabled.");
            return;
        }

        importBible();
    }

    public void importBible() throws Exception {
        System.out.println("Starting KJV Bible import...");

        BibleTranslation translation = translationRepository
                .findByAbbreviation("KJV")
                .orElseThrow(() ->
                        new IllegalStateException(
                                "KJV translation not found."
                        )
                );

        try (InputStream input =
                     getClass().getResourceAsStream("/data/kjv.json")) {

            if (input == null) {
                throw new IllegalStateException(
                        "Could not find resources/data/kjv.json"
                );
            }

            JsonNode root = objectMapper.readTree(input);

            int imported = 0;
            int skipped = 0;
            int chaptersProcessed = 0;

            for (JsonNode book : root.path("books")) {
                String bookName =
                        book.path("englishName").stringValue();

                System.out.println("Processing book: " + bookName);

                for (JsonNode chapterData : book.path("chapters")) {
                    int chapterNumber =
                            chapterData.path("chapter").asInt();

                    int[] chapterCounts = transactionTemplate.execute(
                            transactionStatus -> {
                                BibleChapter chapter = chapterRepository
                                        .findByTranslation_AbbreviationAndBook_NameAndChapterNumber(
                                                translation.getAbbreviation(),
                                                bookName,
                                                chapterNumber
                                        )
                                        .orElseThrow(() ->
                                                new IllegalStateException(
                                                        "Chapter not found: "
                                                                + bookName
                                                                + " "
                                                                + chapterNumber
                                                )
                                        );

                                Set<Integer> existingNumbers =
                                        new HashSet<>();

                                for (BibleVerse existing :
                                        verseRepository.findAllByChapter_Id(
                                                chapter.getId())) {
                                    existingNumbers.add(
                                            existing.getVerseNumber()
                                    );
                                }

                                int chapterImported = 0;
                                int chapterSkipped = 0;

                                for (JsonNode verseData :
                                        chapterData.path("verses")) {

                                    int verseNumber =
                                            verseData.path("number").asInt();

                                    if (!existingNumbers.add(verseNumber)) {
                                        chapterSkipped++;
                                        continue;
                                    }

                                    BibleVerse verse = new BibleVerse();
                                    verse.setChapter(chapter);
                                    verse.setVerseNumber(verseNumber);
                                    verse.setVerseText(
                                            verseData.path("text")
                                                    .stringValue()
                                    );

                                    verseRepository.save(verse);
                                    chapterImported++;
                                }

                                return new int[]{
                                        chapterImported,
                                        chapterSkipped
                                };
                            }
                    );

                    if (chapterCounts != null) {
                        imported += chapterCounts[0];
                        skipped += chapterCounts[1];
                    }

                    chaptersProcessed++;

                    if (chaptersProcessed % 25 == 0) {
                        System.out.println(
                                "Progress: " + chaptersProcessed
                                        + " chapters processed; "
                                        + imported + " verses imported; "
                                        + skipped + " verses skipped."
                        );
                    }
                }
            }

            System.out.println("KJV import completed.");
            System.out.println(
                    "Chapters processed: " + chaptersProcessed
            );
            System.out.println("Verses imported: " + imported);
            System.out.println("Verses skipped: " + skipped);
            System.out.println(
                    "Total verses processed: " + (imported + skipped)
            );
        }
    }
}
