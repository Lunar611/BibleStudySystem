-- Add a sample Bible translation
INSERT INTO bible_translations
(name, abbreviation, language, license, source_url)
VALUES
    ('King James Version', 'KJV', 'English',
     'Public domain in many jurisdictions; verify local status',
     'https://www.kingjamesbibleonline.org/');

-- Add the first Bible book
INSERT INTO bible_books
(name, testament, canonical_order)
VALUES
    ('Genesis', 'OLD', 1);

-- Add Genesis chapter 1
INSERT INTO bible_chapters
(translation_id, book_id, chapter_number)
SELECT
    t.id, b.id, 1
FROM bible_translations t
         CROSS JOIN bible_books b
WHERE t.abbreviation = 'KJV'
  AND b.name = 'Genesis';

-- Add three sample verses
INSERT INTO bible_verses (chapter_id, verse_number, verse_text)
SELECT c.id, v.verse_number, v.verse_text
FROM bible_chapters c
         JOIN bible_translations t ON t.id = c.translation_id
         JOIN bible_books b ON b.id = c.book_id
         CROSS JOIN (
    VALUES
        (1, 'In the beginning God created the heaven and the earth.'),
        (2, 'And the earth was without form, and void; and darkness was upon the face of the deep.'),
        (3, 'And God said, Let there be light: and there was light.')
) AS v(verse_number, verse_text)
WHERE t.abbreviation = 'KJV'
  AND b.name = 'Genesis'
  AND c.chapter_number = 1;
