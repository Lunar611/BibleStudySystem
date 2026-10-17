package com.bible.bible_api.service;

import com.bible.bible_api.entity.BibleChapter;
import com.bible.bible_api.entity.BibleTranslation;
import com.bible.bible_api.entity.BibleVerse;
import com.bible.bible_api.repository.BibleChapterRepository;
import com.bible.bible_api.repository.BibleTranslationRepository;
import com.bible.bible_api.repository.BibleVerseRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.InputStream;

@Component
public class BibleImporter implements CommandLineRunner {

    private final BibleTranslationRepository translationRepository;
    private final BibleChapterRepository chapterRepository;
    private final BibleVerseRepository verseRepository;
    private final ObjectMapper objectMapper;

    public BibleImporter(
            BibleTranslationRepository translationRepository,
            BibleChapterRepository chapterRepository,
            BibleVerseRepository verseRepository,
            ObjectMapper objectMapper
    ) {
        this.translationRepository = translationRepository;
        this.chapterRepository = chapterRepository;
        this.verseRepository = verseRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!Boolean.getBoolean("bible.import.enabled")) {
            System.out.println("KJV import disabled.");
            return;
        }

        importBible();
    }

    public void importBible() throws Exception {
        BibleTranslation translation = translationRepository
                .findByAbbreviation("KJV")
                .orElseThrow(() ->
                        new IllegalStateException("KJV translation not found.")
                );

        InputStream input = getClass().getResourceAsStream("/data/kjv.json");

        if (input == null) {
            throw new IllegalStateException(
                    "Could not find resources/data/kjv.json"
            );
        }

        int imported = 0;
        int skipped = 0;

        try (input) {
            JsonNode root = objectMapper.readTree(input);

            for (JsonNode book : root.path("books")) {
                String bookName = book.path("englishName").asText();

                for (JsonNode chapterData : book.path("chapters")) {
                    int chapterNumber =
                            chapterData.path("chapter").asInt();

                    BibleChapter chapter = chapterRepository
                            .findByTranslation_AbbreviationAndBook_NameAndChapterNumber(
                                    translation.getAbbreviation(),
                                    bookName,
                                    chapterNumber
                            )
                            .orElseThrow(() ->
                                    new IllegalStateException(
                                            "Chapter not found: "
                                                    + bookName + " "
                                                    + chapterNumber
                                    )
                            );

                    for (JsonNode verseData : chapterData.path("verses")) {
                        int verseNumber =
                                verseData.path("number").asInt();

                        if (verseRepository.existsByChapter_IdAndVerseNumber(
                                chapter.getId(),
                                verseNumber
                        )) {
                            skipped++;
                            continue;
                        }

                        BibleVerse verse = new BibleVerse();
                        verse.setChapter(chapter);
                        verse.setVerseNumber(verseNumber);
                        verse.setVerseText(
                                verseData.path("text").asText()
                        );

                        verseRepository.save(verse);
                        imported++;
                    }
                }
            }
        }

        System.out.println("KJV import completed.");
        System.out.println("Verses imported: " + imported);
        System.out.println("Verses skipped: " + skipped);
    }
}