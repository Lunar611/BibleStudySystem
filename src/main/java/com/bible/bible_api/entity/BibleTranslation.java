package com.bible.bible_api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "bible_translations")
public class BibleTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 20)
    private String abbreviation;

    @Column(nullable = false, length = 50)
    private String language;

    @Column(columnDefinition = "TEXT")
    private String license;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    public BibleTranslation() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getAbbreviation() {
        return abbreviation;
    }

    public String getLanguage() {
        return language;
    }

    public String getLicense() {
        return license;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAbbreviation(String abbreviation) {
        this.abbreviation = abbreviation;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public void setLicense(String license) {
        this.license = license;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }
}
