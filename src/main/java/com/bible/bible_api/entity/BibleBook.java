package com.bible.bible_api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "bible_books")
public class BibleBook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String testament;

    @Column(name = "canonical_order", nullable = false, unique = true)
    private Integer canonicalOrder;

    public BibleBook() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getTestament() {
        return testament;
    }

    public Integer getCanonicalOrder() {
        return canonicalOrder;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setTestament(String testament) {
        this.testament = testament;
    }

    public void setCanonicalOrder(Integer canonicalOrder) {
        this.canonicalOrder = canonicalOrder;
    }
}
