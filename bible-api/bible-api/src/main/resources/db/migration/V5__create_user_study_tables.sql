-- V5: User accounts and private Bible study data.
-- Existing Bible tables and migrations remain unchanged.

CREATE TABLE app_users (
                           id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                           display_name VARCHAR(100) NOT NULL,
                           email VARCHAR(254) NOT NULL,
                           password_hash VARCHAR(255) NOT NULL,
                           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_app_users_email_lower
    ON app_users (LOWER(email));


-- Bookmarks

CREATE TABLE study_bookmarks (
                                 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                 user_id BIGINT NOT NULL
                                     REFERENCES app_users(id) ON DELETE CASCADE,
                                 verse_id BIGINT NOT NULL
                                     REFERENCES bible_verses(id) ON DELETE CASCADE,
                                 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 UNIQUE (user_id, verse_id)
);


-- Personal notes

CREATE TABLE study_notes (
                             id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                             user_id BIGINT NOT NULL
                                 REFERENCES app_users(id) ON DELETE CASCADE,
                             verse_id BIGINT NOT NULL
                                 REFERENCES bible_verses(id) ON DELETE CASCADE,
                             note_text TEXT NOT NULL DEFAULT '',
                             created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             UNIQUE (user_id, verse_id)
);

CREATE INDEX idx_study_notes_user_verse
    ON study_notes(user_id, verse_id);


-- Verse and selected-text highlights

CREATE TABLE study_highlights (
                                  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                  user_id BIGINT NOT NULL
                                      REFERENCES app_users(id) ON DELETE CASCADE,
                                  verse_id BIGINT NOT NULL
                                      REFERENCES bible_verses(id) ON DELETE CASCADE,
                                  selected_text TEXT NOT NULL,
                                  color VARCHAR(30) NOT NULL
                                      CHECK (color IN ('yellow', 'green', 'blue', 'pink')),
                                  start_offset INT,
                                  end_offset INT,
                                  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                  CHECK (
                                      (start_offset IS NULL AND end_offset IS NULL)
                                          OR
                                      (
                                          start_offset IS NOT NULL
                                              AND end_offset IS NOT NULL
                                              AND start_offset >= 0
                                              AND end_offset > start_offset
                                          )
                                      )
);

CREATE INDEX idx_study_highlights_user
    ON study_highlights(user_id, created_at);

CREATE INDEX idx_study_highlights_user_verse
    ON study_highlights(user_id, verse_id);


-- User-created tags

CREATE TABLE study_tags (
                            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                            user_id BIGINT NOT NULL
                                REFERENCES app_users(id) ON DELETE CASCADE,
                            name VARCHAR(100) NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            UNIQUE (user_id, name)
);


-- Tags associated with individual highlights

CREATE TABLE study_highlight_tags (
                                      highlight_id BIGINT NOT NULL
                                          REFERENCES study_highlights(id) ON DELETE CASCADE,
                                      tag_id BIGINT NOT NULL
                                          REFERENCES study_tags(id) ON DELETE CASCADE,
                                      PRIMARY KEY (highlight_id, tag_id)
);


-- Last-read chapter for each book and translation

CREATE TABLE study_reading_progress (
                                        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                        user_id BIGINT NOT NULL
                                            REFERENCES app_users(id) ON DELETE CASCADE,
                                        translation_id BIGINT NOT NULL
                                            REFERENCES bible_translations(id) ON DELETE CASCADE,
                                        book_id BIGINT NOT NULL
                                            REFERENCES bible_books(id) ON DELETE CASCADE,
                                        last_chapter_number INT NOT NULL DEFAULT 1
                                            CHECK (last_chapter_number > 0),
                                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                        UNIQUE (user_id, translation_id, book_id)
);


-- Individually completed chapters and their completion timestamps

CREATE TABLE study_completed_chapters (
                                          user_id BIGINT NOT NULL
                                              REFERENCES app_users(id) ON DELETE CASCADE,
                                          translation_id BIGINT NOT NULL
                                              REFERENCES bible_translations(id) ON DELETE CASCADE,
                                          book_id BIGINT NOT NULL
                                              REFERENCES bible_books(id) ON DELETE CASCADE,
                                          chapter_number INT NOT NULL
                                              CHECK (chapter_number > 0),
                                          completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                          PRIMARY KEY (user_id, translation_id, book_id, chapter_number)
);


-- Tracks imported browser-data batches to prevent duplicate imports

CREATE TABLE study_data_imports (
                                    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                    user_id BIGINT NOT NULL
                                        REFERENCES app_users(id) ON DELETE CASCADE,
                                    import_key VARCHAR(100) NOT NULL,
                                    imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    UNIQUE (user_id, import_key)
);
