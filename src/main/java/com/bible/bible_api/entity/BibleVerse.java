package com.bible.bible_api.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "bible_verses",
        uniqueConstraints = {
                @UniqueConstraint(
                        columnNames = {"chapter_id", "verse_number"}
                )
        }
)
public class BibleVerse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chapter_id", nullable = false)
    private BibleChapter chapter;

    @Column(name = "verse_number", nullable = false)
    private Integer verseNumber;

    @Column(name = "verse_text", nullable = false, columnDefinition = "TEXT")
    private String verseText;

    public BibleVerse() {
    }

    public Long getId() {
        return id;
    }

    public BibleChapter getChapter() {
        return chapter;
    }

    public Integer getVerseNumber() {
        return verseNumber;
    }

    public String getVerseText() {
        return verseText;
    }

    public void setChapter(BibleChapter chapter) {
        this.chapter = chapter;
    }

    public void setVerseNumber(Integer verseNumber) {
        this.verseNumber = verseNumber;
    }

    public void setVerseText(String verseText) {
        this.verseText = verseText;
    }
}
