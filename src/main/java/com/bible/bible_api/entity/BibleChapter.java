package com.bible.bible_api.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "bible_chapters",
        uniqueConstraints = {
                @UniqueConstraint(
                        columnNames = {"translation_id", "book_id", "chapter_number"}
                )
        }
)
public class BibleChapter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "translation_id", nullable = false)
    private BibleTranslation translation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private BibleBook book;

    @Column(name = "chapter_number", nullable = false)
    private Integer chapterNumber;

    public BibleChapter() {
    }

    public Long getId() {
        return id;
    }

    public BibleTranslation getTranslation() {
        return translation;
    }

    public BibleBook getBook() {
        return book;
    }

    public Integer getChapterNumber() {
        return chapterNumber;
    }

    public void setTranslation(BibleTranslation translation) {
        this.translation = translation;
    }

    public void setBook(BibleBook book) {
        this.book = book;
    }

    public void setChapterNumber(Integer chapterNumber) {
        this.chapterNumber = chapterNumber;
    }
}
