
import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type Translation = {
  id: number
  abbreviation: string
  name: string
}

type Book = {
  id: number
  name: string
}

type ChapterSummary = {
  id: number
  chapterNumber: number
}

type Chapter = {
  id: number
  translation: string
  book: string
  chapterNumber: number
}

type Verse = {
  id: number
  verseNumber: number
  verseText: string
}

type BibleSearchResult = {
  id: number
  translation: string
  book: string
  chapterNumber: number
  verseNumber: number
  verseText: string
}

function App() {
  const [translations, setTranslations] = useState<Translation[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [translation, setTranslation] = useState('KJV')
  const [book, setBook] = useState('Genesis')
  const [chapter, setChapter] = useState(1)
  const [chapterCount, setChapterCount] = useState(0)
  const [verses, setVerses] = useState<Verse[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  // Bible search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BibleSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  // Load translations and books.
  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      try {
        const [translationResponse, bookResponse] = await Promise.all([
          fetch('/api/translations'),
          fetch('/api/books'),
        ])

        if (!translationResponse.ok || !bookResponse.ok) {
          throw new Error('Could not load Bible options.')
        }

        const translationData: Translation[] =
          await translationResponse.json()
        const bookData: Book[] = await bookResponse.json()

        if (
          !Array.isArray(translationData) ||
          !Array.isArray(bookData)
        ) {
          throw new Error('Invalid Bible options response.')
        }

        if (cancelled) return

        setTranslations(translationData)
        setBooks(bookData)

        if (translationData.length > 0) {
          const defaultTranslation =
            translationData.find((item) => item.abbreviation === 'KJV') ??
            translationData[0]

          setTranslation(defaultTranslation.abbreviation)
        }

        if (bookData.length > 0) {
          const defaultBook =
            bookData.find((item) => item.name === 'Genesis') ??
            bookData[0]

          setBook(defaultBook.name)
        }
      } catch {
        if (!cancelled) {
          setError('Could not load translations or Bible books.')
        }
      }
    }

    loadOptions()

    return () => {
      cancelled = true
    }
  }, [])

  // Retrieve the available chapters for the selected book.
  useEffect(() => {
    if (!translation || !book) return

    const controller = new AbortController()

    async function loadChapterList() {
      setChapterCount(0)

      try {
        const response = await fetch(
          `/api/translations/${encodeURIComponent(translation)}` +
            `/books/${encodeURIComponent(book)}/chapters`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error('Could not load the chapter list.')
        }

        const data: ChapterSummary[] = await response.json()

        if (!Array.isArray(data)) {
          throw new Error('Invalid chapter list response.')
        }

        setChapterCount(data.length)

        if (data.length > 0 && chapter > data.length) {
          setChapter(data.length)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        if (!controller.signal.aborted) {
          setError('Could not load the chapter list for this book.')
        }
      }
    }

    loadChapterList()

    return () => controller.abort()
  }, [translation, book, chapter])

  // Load the selected chapter and its verses.
  useEffect(() => {
    if (!translation || !book || chapter < 1) return

    const controller = new AbortController()

    async function loadChapter() {
      setLoading(true)
      setError('')
      setVerses([])

      try {
        const chapterUrl =
          `/api/translations/${encodeURIComponent(translation)}` +
          `/books/${encodeURIComponent(book)}` +
          `/chapters/${chapter}`

        const chapterResponse = await fetch(chapterUrl, {
          signal: controller.signal,
        })

        if (!chapterResponse.ok) {
          throw new Error(
            `${book} ${chapter} was not found in ${translation}.`,
          )
        }

        const chapterData: Chapter = await chapterResponse.json()

        if (
          !chapterData ||
          typeof chapterData.id !== 'number' ||
          !Number.isFinite(chapterData.id)
        ) {
          throw new Error('Invalid chapter information from the server.')
        }

        const versesResponse = await fetch(
          `/api/chapters/${chapterData.id}/verses`,
          { signal: controller.signal },
        )

        if (!versesResponse.ok) {
          throw new Error('Could not load this chapter’s verses.')
        }

        const versesData: unknown = await versesResponse.json()

        if (!Array.isArray(versesData)) {
          throw new Error('The server did not return a verse list.')
        }

        setVerses(versesData as Verse[])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        setError(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadChapter()

    return () => controller.abort()
  }, [translation, book, chapter])

  // Search Bible verses using the Spring Boot API.
  async function searchBible(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const keyword = searchQuery.trim()

    if (!keyword) {
      setSearchError('Enter a word or phrase to search.')
      setSearchResults([])
      setHasSearched(false)
      return
    }

    setSearchLoading(true)
    setSearchError('')
    setSearchResults([])
    setHasSearched(true)

    try {
      const response = await fetch(
        `/api/search?translation=${encodeURIComponent(translation)}` +
          `&query=${encodeURIComponent(keyword)}`,
      )

      if (!response.ok) {
        throw new Error('Could not search the Bible. Please try again.')
      }

      const data: unknown = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('The server returned an invalid search response.')
      }

      setSearchResults(data as BibleSearchResult[])
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during search.',
      )
    } finally {
      setSearchLoading(false)
    }
  }

  // Open the chapter containing a selected search result.
  function openSearchResult(result: BibleSearchResult) {
    setBook(result.book)
    setChapter(result.chapterNumber)
    setError('')
    setSearchResults([])
    setHasSearched(false)
  }

  function changeBook(newBook: string) {
    setBook(newBook)
    setChapter(1)
  }

  function changeTranslation(newTranslation: string) {
    setTranslation(newTranslation)
    setChapter(1)
    setSearchResults([])
    setHasSearched(false)
    setSearchError('')
  }

  async function goPrevious() {
    if (loading) return

    if (chapter > 1) {
      setChapter((current) => current - 1)
      return
    }

    const bookIndex = books.findIndex((item) => item.name === book)

    if (bookIndex <= 0) return

    const previousBook = books[bookIndex - 1]

    try {
      const response = await fetch(
        `/api/translations/${encodeURIComponent(translation)}` +
          `/books/${encodeURIComponent(previousBook.name)}/chapters`,
      )

      if (!response.ok) {
        throw new Error('Could not find the previous book’s chapters.')
      }

      const data: ChapterSummary[] = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('The previous book has no available chapters.')
      }

      setBook(previousBook.name)
      setChapter(data.length)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Navigation failed.',
      )
    }
  }

  function goNext() {
    if (loading || chapterCount === 0) return

    if (chapter < chapterCount) {
      setChapter((current) => current + 1)
      return
    }

    const bookIndex = books.findIndex((item) => item.name === book)
    const nextBook = books[bookIndex + 1]

    if (nextBook) {
      setBook(nextBook.name)
      setChapter(1)
    }
  }

  const bookIndex = books.findIndex((item) => item.name === book)
  const isFirstChapter = chapter <= 1 && bookIndex <= 0
  const isLastChapter =
    chapterCount > 0 &&
    chapter >= chapterCount &&
    bookIndex === books.length - 1

  return (
    <main className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Word and Wisdom home">
          <span className="brand-symbol">✦</span>
          Word &amp; Wisdom
        </a>

        <div className="header-actions">
          <span className="header-caption">BIBLE READING &amp; STUDY</span>

          <button
            className="theme-toggle"
            onClick={() => setDarkMode((current) => !current)}
            aria-label={
              darkMode ? 'Switch to light theme' : 'Switch to dark theme'
            }
            title={darkMode ? 'Light theme' : 'Dark theme'}
          >
            {darkMode ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </header>

      <div className="reader-layout" id="top">
        <aside className="sidebar">
          <p className="sidebar-heading">YOUR BIBLE</p>

          <label className="field-label" htmlFor="translation">
            Translation
          </label>
          <select
            id="translation"
            className="field-control"
            value={translation}
            onChange={(event) => changeTranslation(event.target.value)}
            disabled={translations.length === 0}
          >
            {translations.map((item) => (
              <option key={item.id} value={item.abbreviation}>
                {item.abbreviation} — {item.name}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="book">
            Book
          </label>
          <select
            id="book"
            className="field-control"
            value={book}
            onChange={(event) => changeBook(event.target.value)}
            disabled={books.length === 0}
          >
            {books.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="chapter">
            Chapter
          </label>
          <input
            id="chapter"
            className="field-control"
            type="number"
            min="1"
            max={chapterCount || undefined}
            step="1"
            value={chapter}
            onChange={(event) => {
              const rawValue = event.target.value

              if (rawValue === '') return

              const value = Number(rawValue)

              if (
                Number.isInteger(value) &&
                value >= 1 &&
                (chapterCount === 0 || value <= chapterCount)
              ) {
                setChapter(value)
              }
            }}
            disabled={chapterCount === 0}
          />

          {chapterCount > 0 && (
            <p className="chapter-count">
              {chapterCount} chapters in {book}
            </p>
          )}

          <div className="sidebar-divider" />

          <p className="sidebar-heading">QUICK NAVIGATION</p>

          <button
            className="sidebar-link"
            onClick={() => {
              setBook('Genesis')
              setChapter(1)
            }}
          >
            <span>⌂</span> Beginning
          </button>

          <button
            className="sidebar-link"
            onClick={() => {
              setBook('Psalms')
              setChapter(1)
            }}
            disabled={!books.some((item) => item.name === 'Psalms')}
          >
            <span>♫</span> Psalms
          </button>

          <button
            className="sidebar-link"
            onClick={() => {
              setBook('John')
              setChapter(1)
            }}
            disabled={!books.some((item) => item.name === 'John')}
          >
            <span>✧</span> Gospel of John
          </button>
        </aside>

        <section className="reader">
          <div className="reader-heading">
            <p className="eyebrow">YOUR DAILY TIME IN THE WORD</p>
            <h1>Read the Bible</h1>
            <p className="intro">
              Take a moment to read, reflect, and grow in understanding.
            </p>
          </div>

          {/* Bible search */}
          <section className="bible-search" aria-label="Search the Bible">
            <h2>Search the Scriptures</h2>
            <p className="search-description">
              Find words and phrases throughout the selected Bible translation.
            </p>

            <form className="search-form" onSubmit={searchBible}>
              <input
                className="search-input"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Try searching for love, faith, or hope..."
                aria-label="Search Bible verses"
              />

              <button
                className="search-button"
                type="submit"
                disabled={searchLoading}
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchError && (
              <p className="search-error" role="alert">
                {searchError}
              </p>
            )}

            {searchLoading && (
              <p className="search-status" role="status">
                Searching the Scriptures...
              </p>
            )}

            {!searchLoading && hasSearched && !searchError && (
              <div className="search-results" aria-live="polite">
                <p className="search-result-count">
                  {searchResults.length === 0
                    ? 'No matching verses found.'
                    : `${searchResults.length} matching verse${
                        searchResults.length === 1 ? '' : 's'
                      } found`}
                  {searchResults.length === 100
                    ? ' (showing up to 100 results)'
                    : ''}
                </p>

                {searchResults.map((result) => (
                  <button
                    className="search-result"
                    type="button"
                    key={result.id}
                    onClick={() => openSearchResult(result)}
                  >
                    <span className="search-result-reference">
                      {result.book} {result.chapterNumber}:{result.verseNumber}
                    </span>

                    <span className="search-result-text">
                      {result.verseText}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="reading-toolbar">
            <span className="reading-label">NOW READING</span>
            <span className="reading-reference">
              {book} {chapter}
            </span>
            <span className="translation-badge">{translation}</span>
          </div>

          {error && (
            <div className="error" role="alert">
              {error}
              <button
                className="dismiss-error"
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <article className="scripture">
            <div className="scripture-heading">
              <span className="ornament">✦</span>
              <h2>{book}</h2>
              <p>CHAPTER {chapter}</p>
            </div>

            {loading && (
              <div className="loading-state" role="status">
                <span className="loading-symbol">✦</span>
                <p>Opening the Scriptures...</p>
              </div>
            )}

            {!loading && !error && verses.length === 0 && (
              <p className="empty-state">
                No verses were found for this chapter.
              </p>
            )}

            {!loading && !error && verses.length > 0 && (
              <div className="verses">
                {verses.map((verse) => (
                  <p className="verse" key={verse.id}>
                    <sup>{verse.verseNumber}</sup>
                    <span>{verse.verseText}</span>
                  </p>
                ))}
              </div>
            )}
          </article>

          <nav className="chapter-nav" aria-label="Chapter navigation">
            <button
              className="nav-button"
              disabled={isFirstChapter || loading}
              onClick={goPrevious}
            >
              <span aria-hidden="true">←</span>
              <span>
                <small>PREVIOUS</small>
                <strong>Chapter</strong>
              </span>
            </button>

            <span className="nav-reference">
              {book} {chapter}
              {chapterCount > 0 && ` of ${chapterCount}`}
            </span>

            <button
              className="nav-button next-button"
              disabled={isLastChapter || loading || chapterCount === 0}
              onClick={goNext}
            >
              <span>
                <small>NEXT</small>
                <strong>Chapter</strong>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </nav>

          <footer className="reader-footer">
            WORD &amp; WISDOM <span>·</span> READ WITH PURPOSE
          </footer>
        </section>
      </div>
    </main>
  )
}

export default App
