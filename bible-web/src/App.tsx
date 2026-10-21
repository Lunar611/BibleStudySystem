import { useEffect, useState, type FormEvent } from 'react'
import {
  getOfflineChapter,
  getOfflineChapterCount,
  getOfflineChapters,
  saveOfflineChapter,
} from './offlineBible'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    return fetch(`${API_BASE_URL}${input}`, init)
  }

  return fetch(input, init)
}

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

type BibleSearchPageResponse = {
  results: BibleSearchResult[]
  totalResults: number
  currentPage: number
  pageSize: number
  totalPages: number
}

type SavedVerse = {
  key: string
  translation: string
  book: string
  chapterNumber: number
  verseNumber: number
  verseText: string
  note: string
}

const SAVED_VERSES_KEY = 'word-and-wisdom-saved-verses'
const VERSE_HIGHLIGHTS_KEY = 'word-and-wisdom-verse-highlights'
const CUSTOM_TAGS_KEY = 'word-and-wisdom-custom-tags'
const READING_PROGRESS_KEY = 'word-and-wisdom-reading-progress'

type ReadChapter = { key: string; translation: string; book: string; chapterNumber: number; readAt: string }

type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink'
type VerseHighlight = {
  key: string
  translation: string
  book: string
  chapterNumber: number
  verseNumber: number
  verseText: string
  color: HighlightColor
  tags: string[]
  start?: number
  end?: number
}

type PendingTextSelection = { key: string; verseNumber: number; verseText: string; start: number; end: number }

const HIGHLIGHT_COLORS: { value: HighlightColor; label: string; hex: string }[] = [
  { value: 'yellow', label: 'Soft yellow', hex: '#f5edbd' },
  { value: 'green', label: 'Soft green', hex: '#dcebd8' },
  { value: 'blue', label: 'Soft blue', hex: '#dce8f5' },
  { value: 'pink', label: 'Soft pink', hex: '#f2dfe6' },
]
const BUILT_IN_TAGS = ['Faith', 'Hope', 'Prayer', 'Wisdom']

const BIBLE_BOOK_ORDER = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua',
  'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job',
  'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
  'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
  'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
  '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John',
  '3 John', 'Jude', 'Revelation',
]

function offlineBooksFromChapters(chapters: Awaited<ReturnType<typeof getOfflineChapters>>): Book[] {
  const names = [...new Set(chapters.map((item) => item.book))]
  names.sort((a, b) => {
    const aIndex = BIBLE_BOOK_ORDER.indexOf(a)
    const bIndex = BIBLE_BOOK_ORDER.indexOf(b)
    return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) -
      (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex)
  })
  return names.map((name, index) => ({ id: index + 1, name }))
}

function loadHighlights(): VerseHighlight[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(VERSE_HIGHLIGHTS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is VerseHighlight =>
      item !== null && typeof item === 'object' &&
      typeof item.key === 'string' && typeof item.translation === 'string' &&
      typeof item.book === 'string' && typeof item.chapterNumber === 'number' &&
      typeof item.verseNumber === 'number' && typeof item.verseText === 'string' &&
      ['yellow', 'green', 'blue', 'pink'].includes(item.color) &&
      Array.isArray(item.tags) && item.tags.every((tag: unknown) => typeof tag === 'string'),
    )
  } catch { return [] }
}

function loadCustomTags(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CUSTOM_TAGS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
  } catch { return [] }
}

function loadReadingProgress(): ReadChapter[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(READING_PROGRESS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ReadChapter => item && typeof item.key === 'string' && typeof item.translation === 'string' && typeof item.book === 'string' && typeof item.chapterNumber === 'number' && typeof item.readAt === 'string')
  } catch { return [] }
}

function getProgressKey(translation: string, book: string, chapterNumber: number) {
  return `${translation}|${book}|${chapterNumber}`
}

function loadSavedVerses(): SavedVerse[] {
  try {
    const stored = localStorage.getItem(SAVED_VERSES_KEY)

    if (!stored) return []

    const parsed: unknown = JSON.parse(stored)

    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is SavedVerse =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.key === 'string' &&
        typeof item.translation === 'string' &&
        typeof item.book === 'string' &&
        typeof item.chapterNumber === 'number' &&
        typeof item.verseNumber === 'number' &&
        typeof item.verseText === 'string' &&
        typeof item.note === 'string',
    )
  } catch {
    return []
  }
}

function App() {
  const [translations, setTranslations] = useState<Translation[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [translation, setTranslation] = useState('KJV')
  const [book, setBook] = useState('Genesis')
  const [chapter, setChapter] = useState(1)
  const [chapterInput, setChapterInput] = useState('1')

  const [chapterCount, setChapterCount] = useState(0)
  const [verses, setVerses] = useState<Verse[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const [offlineChapterCount, setOfflineChapterCount] = useState(0)
  const [downloadingBible, setDownloadingBible] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadMessage, setDownloadMessage] = useState('')

  // Verse range selection
  const [verseFrom, setVerseFrom] = useState('')
  const [verseTo, setVerseTo] = useState('')

  // Bible search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BibleSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  // Advanced search filters and pagination
  const [searchBook, setSearchBook] = useState('')
  const [exactPhrase, setExactPhrase] = useState(false)
  const [searchPage, setSearchPage] = useState(0)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Bookmarks and personal notes
  const [savedVerses, setSavedVerses] =
    useState<SavedVerse[]>(loadSavedVerses)
  const [showSavedVerses, setShowSavedVerses] = useState(false)
  const [highlights, setHighlights] = useState<VerseHighlight[]>(loadHighlights)
  const [pendingTextSelection, setPendingTextSelection] = useState<PendingTextSelection | null>(null)
  const [customTags, setCustomTags] = useState<string[]>(loadCustomTags)
  const [newTag, setNewTag] = useState('')
  const [highlightFilterColor, setHighlightFilterColor] = useState('all')
  const [highlightFilterTag, setHighlightFilterTag] = useState('all')
  const [readingProgress, setReadingProgress] = useState<ReadChapter[]>(loadReadingProgress)
  const [showReadingProgress, setShowReadingProgress] = useState(false)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [saveReference, setSaveReference] = useState('')
  const [saveReferenceError, setSaveReferenceError] = useState('')
  const [saveReferenceStatus, setSaveReferenceStatus] = useState('')

  useEffect(() => {
    getOfflineChapterCount()
      .then(setOfflineChapterCount)
      .catch(() => setOfflineChapterCount(0))
  }, [])

  // Persist verse highlights and custom tags separately from bookmarks and reading progress.
  useEffect(() => {
    try { localStorage.setItem(VERSE_HIGHLIGHTS_KEY, JSON.stringify(highlights)) }
    catch { setError('Could not save verse highlights in this browser.') }
  }, [highlights])

  useEffect(() => {
    try { localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(customTags)) }
    catch { setError('Could not save custom tags in this browser.') }
  }, [customTags])

  // Save bookmarks and notes whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_VERSES_KEY, JSON.stringify(savedVerses))
    } catch {
      setError('Could not save your bookmarks in this browser.')
    }
  }, [savedVerses])

  useEffect(() => {
    try { localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(readingProgress)) }
    catch { setError('Could not save reading progress in this browser.') }
  }, [readingProgress])

  // Keep the displayed chapter number synchronized with navigation.
  useEffect(() => {
    setChapterInput(String(chapter))
  }, [chapter])

  // Load translations and books.
  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      try {
        const [translationResponse, bookResponse] = await Promise.all([
          apiFetch('/api/translations'),
          apiFetch('/api/books'),
        ])

        if (!translationResponse.ok || !bookResponse.ok) {
          throw new Error('Could not load Bible options.')
        }

        const translationData: Translation[] =
          await translationResponse.json()
        const bookData: Book[] = await bookResponse.json()

        if (!Array.isArray(translationData) || !Array.isArray(bookData)) {
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
            bookData.find((item) => item.name === 'Genesis') ?? bookData[0]

          setBook(defaultBook.name)
        }
      } catch {
        if (cancelled) return

        try {
          const cachedChapters = await getOfflineChapters()
          if (cachedChapters.length === 0) {
            setError('Could not load translations or Bible books. Connect to the internet to download the Bible for offline use.')
            return
          }

          setTranslations([{ id: 1, abbreviation: 'KJV', name: 'King James Version' }])
          const offlineBooks = offlineBooksFromChapters(cachedChapters)
          setBooks(offlineBooks)
          setTranslation('KJV')
          setBook(offlineBooks.find((item) => item.name === 'Genesis')?.name ?? offlineBooks[0].name)
          setDownloadMessage('Offline mode: using Bible chapters saved on this device.')
          setError('')
        } catch {
          setError('Could not load translations or Bible books. Connect to the internet to download the Bible for offline use.')
        }
      }
    }

    loadOptions()

    return () => {
      cancelled = true
    }
  }, [])

  // Retrieve chapters for the selected book.
  useEffect(() => {
    if (!translation || !book) return

    const controller = new AbortController()

    async function loadChapterList() {
      setChapterCount(0)

      try {
        const response = await apiFetch(
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
          try {
            const cached = await getOfflineChapters()
            const cachedForBook = cached.filter(
              (item) => item.translation === translation && item.book === book,
            )
            if (cachedForBook.length > 0) {
              const count = Math.max(...cachedForBook.map((item) => item.chapterNumber))
              setChapterCount(count)
              if (chapter > count) setChapter(count)
              setError('')
            } else {
              setChapterCount(0)
              setError(`No offline chapters are saved for ${book}. Connect to the internet to load this book.`)
            }
          } catch {
            setError('Could not load the chapter list for this book.')
          }
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

        const chapterResponse = await apiFetch(chapterUrl, {
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

        const versesResponse = await apiFetch(
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

        const validVerses = versesData as Verse[]
        setVerses(validVerses)
        await saveOfflineChapter({
          key: `${translation}|${book}|${chapter}`,
          translation,
          book,
          chapterNumber: chapter,
          verses: validVerses,
          savedAt: Date.now(),
        }).catch(() => undefined)
        getOfflineChapterCount().then(setOfflineChapterCount).catch(() => undefined)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        try {
          const cachedChapter = await getOfflineChapter(translation, book, chapter)
          if (cachedChapter && cachedChapter.verses.length > 0) {
            setVerses(cachedChapter.verses)
            setError('')
            setDownloadMessage('Offline mode: displaying a chapter saved on this device.')
          } else {
            setError(
              err instanceof Error
                ? `${err.message} This chapter is not saved for offline use.`
                : 'An unexpected error occurred. This chapter is not saved for offline use.',
            )
          }
        } catch {
          setError(
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadChapter()

    return () => controller.abort()
  }, [translation, book, chapter])

  // Create a consistent key for each verse and translation.
  function getVerseKey(
    verseTranslation: string,
    verseBook: string,
    verseChapter: number,
    verseNumber: number,
  ) {
    return `${verseTranslation}|${verseBook}|${verseChapter}|${verseNumber}`
  }

  function captureSelectedText(verse: Verse, textElement: HTMLSpanElement) {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    // Only capture a selection fully contained in this verse. Do not clear an
    // existing pending selection just because another event fires elsewhere.
    if (!textElement.contains(range.startContainer) || !textElement.contains(range.endContainer)) return

    const beforeRange = range.cloneRange()
    beforeRange.selectNodeContents(textElement)
    beforeRange.setEnd(range.startContainer, range.startOffset)

    const start = beforeRange.toString().length
    const selectedText = range.toString()
    const domText = textElement.textContent ?? ''
    const end = start + selectedText.length

    // The DOM contains nested spans/marks, so compare against its flattened text
    // rather than requiring browser selection text to exactly match a JS slice.
    // This avoids rejecting valid selections in already-highlighted text.
    if (!selectedText.trim() || end <= start || domText.length !== verse.verseText.length) return

    setPendingTextSelection({
      key: getVerseKey(translation, book, chapter, verse.verseNumber),
      verseNumber: verse.verseNumber,
      verseText: verse.verseText,
      start: Math.max(0, Math.min(start, verse.verseText.length)),
      end: Math.max(0, Math.min(end, verse.verseText.length)),
    })
  }

  function scheduleCaptureSelectedText(verse: Verse, textElement: HTMLSpanElement, delay = 40) {
    // Android/iOS PWAs can update the native text selection after touchend.
    // A short delay lets the browser finish that update before we read it.
    window.setTimeout(() => captureSelectedText(verse, textElement), delay)
  }

  function getHighlightHex(color: HighlightColor) {
    if (darkMode) {
      const darkColors: Record<HighlightColor, string> = {
        yellow: '#62552b',
        green: '#31553b',
        blue: '#304b66',
        pink: '#603b49',
      }
      return darkColors[color]
    }
    return HIGHLIGHT_COLORS.find((item) => item.value === color)?.hex ?? '#f5edbd'
  }

  function saveSelectedTextHighlight(color: HighlightColor) {
    if (!pendingTextSelection) return
    const base = pendingTextSelection
    const key = `${base.key}|${base.start}-${base.end}`
    const selectedText = base.verseText.slice(base.start, base.end)
    setHighlights((current) => {
      const existing = current.find((item) => item.key === key)
      if (existing) return current.map((item) => item.key === key ? { ...item, color, verseText: base.verseText } : item)
      return [...current, {
        key,
        translation,
        book,
        chapterNumber: chapter,
        verseNumber: base.verseNumber,
        verseText: selectedText,
        color,
        tags: [],
        start: base.start,
        end: base.end,
      }]
    })
    window.getSelection()?.removeAllRanges()
    setPendingTextSelection(null)
  }

  function getVerseHighlightKey(verseNumber: number) {
    return getVerseKey(translation, book, chapter, verseNumber)
  }

  function getTextHighlightSegments(verse: Verse) {
    const baseKey = getVerseHighlightKey(verse.verseNumber)
    const verseLevel = highlights.find((item) => item.key === baseKey && (typeof item.start !== 'number' || typeof item.end !== 'number'))
    if (verseLevel) return [{ text: verse.verseText, color: verseLevel.color, start: 0, end: verse.verseText.length }]
    const matching = highlights
      .filter((item) => item.key.startsWith(`${baseKey}|`))
      .filter((item) => typeof item.start === 'number' && typeof item.end === 'number')
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
    const segments: { text: string; color?: HighlightColor; start: number; end: number }[] = []
    let cursor = 0
    matching.forEach((item) => {
      const start = Math.max(cursor, Math.min(verse.verseText.length, item.start ?? 0))
      const end = Math.max(start, Math.min(verse.verseText.length, item.end ?? start))
      if (start > cursor) segments.push({ text: verse.verseText.slice(cursor, start), start: cursor, end: start })
      if (end > start) segments.push({ text: verse.verseText.slice(start, end), color: item.color, start, end })
      cursor = Math.max(cursor, end)
    })
    if (cursor < verse.verseText.length) segments.push({ text: verse.verseText.slice(cursor), start: cursor, end: verse.verseText.length })
    if (matching.length === 0) return [{ text: verse.verseText, start: 0, end: verse.verseText.length }]
    return segments
  }

  function removeHighlight(key: string) {
    setHighlights((current) => current.filter((item) => item.key !== key))
  }

  function toggleHighlightTag(key: string, tag: string) {
    setHighlights((current) => current.map((item) => {
      if (item.key !== key) return item
      const tags = item.tags.includes(tag) ? item.tags.filter((existing) => existing !== tag) : [...item.tags, tag]
      return { ...item, tags }
    }))
  }

  function addCustomTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const tag = newTag.trim()
    if (!tag) return
    if ([...BUILT_IN_TAGS, ...customTags].some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setNewTag('')
      return
    }
    setCustomTags((current) => [...current, tag])
    setNewTag('')
  }

  function openHighlightedVerse(saved: VerseHighlight) {
    setTranslation(saved.translation)
    setBook(saved.book)
    setChapter(saved.chapterNumber)
    setChapterInput(String(saved.chapterNumber))
    setVerseFrom(String(saved.verseNumber))
    setVerseTo(String(saved.verseNumber))
    setError('')
    setShowSavedVerses(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Save verses by typing a reference such as "John 3:16" or "Psalm 23:1-3".
  async function saveTypedReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveReferenceError('')
    setSaveReferenceStatus('')

    const input = saveReference.trim()
    const match = input.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/)

    if (!match) {
      setSaveReferenceError('Enter a reference like John 3:16 or Psalm 23:1-3.')
      return
    }

    const typedBook = match[1].trim()
    const chapterNumber = Number(match[2])
    const startVerse = Number(match[3])
    const endVerse = Number(match[4] ?? match[3])
    const matchingBook = books.find(
      (item) => item.name.toLowerCase() === typedBook.toLowerCase(),
    )

    if (!matchingBook) {
      setSaveReferenceError(`I couldn't find the Bible book "${typedBook}".`)
      return
    }

    if (
      !Number.isInteger(chapterNumber) || chapterNumber < 1 ||
      !Number.isInteger(startVerse) || startVerse < 1 ||
      !Number.isInteger(endVerse) || endVerse < startVerse
    ) {
      setSaveReferenceError('Enter a valid chapter and verse range.')
      return
    }

    try {
      let chapterVerses: Verse[]

      try {
        const chapterResponse = await apiFetch(
          `/api/translations/${encodeURIComponent(translation)}` +
            `/books/${encodeURIComponent(matchingBook.name)}/chapters/${chapterNumber}`,
        )

        if (!chapterResponse.ok) {
          throw new Error(`${matchingBook.name} ${chapterNumber} was not found in ${translation}.`)
        }

        const chapterData: Chapter = await chapterResponse.json()
        const versesResponse = await apiFetch(`/api/chapters/${chapterData.id}/verses`)

        if (!versesResponse.ok) {
          throw new Error('Could not retrieve the verses for that reference.')
        }

        chapterVerses = await versesResponse.json()
        if (!Array.isArray(chapterVerses) || chapterVerses.length === 0) {
          throw new Error('No verses were found for that chapter.')
        }
      } catch (networkError) {
        const cachedChapter = await getOfflineChapter(translation, matchingBook.name, chapterNumber)
        if (!cachedChapter || cachedChapter.verses.length === 0) {
          throw networkError
        }
        chapterVerses = cachedChapter.verses
      }

      if (endVerse > chapterVerses.length) {
        throw new Error(`That chapter only has ${chapterVerses.length} verses.`)
      }

      const selectedVerses = chapterVerses.filter(
        (verse) => verse.verseNumber >= startVerse && verse.verseNumber <= endVerse,
      )
      const existingKeys = new Set(savedVerses.map((saved) => saved.key))
      const newSavedVerses: SavedVerse[] = selectedVerses
        .filter((verse) => !existingKeys.has(
          getVerseKey(translation, matchingBook.name, chapterNumber, verse.verseNumber),
        ))
        .map((verse) => ({
          key: getVerseKey(translation, matchingBook.name, chapterNumber, verse.verseNumber),
          translation,
          book: matchingBook.name,
          chapterNumber,
          verseNumber: verse.verseNumber,
          verseText: verse.verseText,
          note: '',
        }))

      if (newSavedVerses.length === 0) {
        setSaveReferenceStatus('Those verses are already in your Personal Study.')
      } else {
        setSavedVerses((current) => [...current, ...newSavedVerses])
        setSaveReferenceStatus(
          `Saved ${newSavedVerses.length} verse${newSavedVerses.length === 1 ? '' : 's'} from ${matchingBook.name} ${chapterNumber}:${startVerse}${endVerse !== startVerse ? `-${endVerse}` : ''}.`,
        )
      }
      setSaveReference('')
    } catch (err) {
      setSaveReferenceError(
        err instanceof Error ? err.message : 'Could not save that Bible reference.',
      )
    }
  }

  // Update a note for a saved verse.
  function updateNote(key: string, note: string) {
    setSavedVerses((current) =>
      current.map((saved) =>
        saved.key === key ? { ...saved, note } : saved,
      ),
    )
  }

  // Open a bookmarked verse in the reader.
  function openSavedVerse(saved: SavedVerse) {
    setTranslation(saved.translation)
    setBook(saved.book)
    setChapter(saved.chapterNumber)
    setChapterInput(String(saved.chapterNumber))
    setVerseFrom(String(saved.verseNumber))
    setVerseTo(String(saved.verseNumber))
    setError('')
    setShowSavedVerses(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Search Bible verses with filters and pagination.
  async function runBibleSearch(pageNumber: number) {
    const keyword = searchQuery.trim()

    if (!keyword) {
      setSearchError('Enter a word or phrase to search.')
      setSearchResults([])
      setTotalResults(0)
      setTotalPages(0)
      setHasSearched(false)
      return
    }

    setSearchLoading(true)
    setSearchError('')
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        translation,
        query: keyword,
        book: searchBook,
        exactPhrase: String(exactPhrase),
        page: String(pageNumber),
        size: '20',
      })

      const response = await apiFetch(`/api/search?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Could not search the Bible. Please try again.')
      }

      const data: BibleSearchPageResponse = await response.json()

      if (
        !data ||
        !Array.isArray(data.results) ||
        typeof data.totalResults !== 'number' ||
        typeof data.currentPage !== 'number' ||
        typeof data.totalPages !== 'number'
      ) {
        throw new Error('The server returned an invalid search response.')
      }

      setSearchResults(data.results)
      setTotalResults(data.totalResults)
      setTotalPages(data.totalPages)
      setSearchPage(data.currentPage)
    } catch (err) {
      try {
        const cachedChapters = await getOfflineChapters()
        if (cachedChapters.length === 0) throw err

        const normalizedKeyword = keyword.toLocaleLowerCase()
        const terms = normalizedKeyword.split(/\\s+/).filter(Boolean)
        const matches: BibleSearchResult[] = cachedChapters
          .filter((item) => item.translation === translation)
          .filter((item) => !searchBook || item.book === searchBook)
          .flatMap((item) => item.verses
            .filter((verse) => {
              const text = verse.verseText.toLocaleLowerCase()
              return exactPhrase
                ? text.includes(normalizedKeyword)
                : terms.every((term) => text.includes(term))
            })
            .map((verse) => ({
              id: verse.id,
              translation: item.translation,
              book: item.book,
              chapterNumber: item.chapterNumber,
              verseNumber: verse.verseNumber,
              verseText: verse.verseText,
            })),
          )
          .sort((a, b) => {
            const bookDifference = BIBLE_BOOK_ORDER.indexOf(a.book) - BIBLE_BOOK_ORDER.indexOf(b.book)
            return bookDifference || a.chapterNumber - b.chapterNumber || a.verseNumber - b.verseNumber
          })

        const start = pageNumber * 20
        setSearchResults(matches.slice(start, start + 20))
        setTotalResults(matches.length)
        setTotalPages(Math.ceil(matches.length / 20))
        setSearchPage(pageNumber)
        setSearchError('')
        setDownloadMessage('Offline search searches chapters downloaded to this device.')
      } catch {
        setSearchResults([])
        setTotalResults(0)
        setTotalPages(0)
        setSearchError(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during search.',
        )
      }
    } finally {
      setSearchLoading(false)
    }
  }

  async function searchBible(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runBibleSearch(0)
  }

  // Open a search result at its specific verse.
  function openSearchResult(result: BibleSearchResult) {
    setTranslation(result.translation || translation)
    setBook(result.book)
    setChapter(result.chapterNumber)
    setChapterInput(String(result.chapterNumber))
    setVerseFrom(String(result.verseNumber))
    setVerseTo(String(result.verseNumber))
    setError('')
    setSearchResults([])
    setHasSearched(false)
  }

  function changeBook(newBook: string) {
    setBook(newBook)
    setChapter(1)
    setChapterInput('1')
    setVerseFrom('')
    setVerseTo('')
    setError('')
  }

  function changeTranslation(newTranslation: string) {
    setTranslation(newTranslation)
    setChapter(1)
    setChapterInput('1')
    setVerseFrom('')
    setVerseTo('')
    setSearchResults([])
    setHasSearched(false)
    setSearchError('')
    setTotalResults(0)
    setTotalPages(0)
    setSearchPage(0)
  }

  function applyChapterInput() {
    const trimmedValue = chapterInput.trim()
    const value = Number(trimmedValue)

    if (
      trimmedValue !== '' &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= chapterCount
    ) {
      setChapter(value)
      setChapterInput(String(value))
      setVerseFrom('')
      setVerseTo('')
    } else {
      setChapterInput(String(chapter))
    }
  }

  // Validate verse range.
  const verseRangeStart = verseFrom.trim() === '' ? null : Number(verseFrom)
  const verseRangeEnd = verseTo.trim() === '' ? null : Number(verseTo)

  const verseRangeInvalid =
    (verseRangeStart !== null &&
      (!Number.isInteger(verseRangeStart) ||
        verseRangeStart < 1 ||
        verseRangeStart > verses.length)) ||
    (verseRangeEnd !== null &&
      (!Number.isInteger(verseRangeEnd) ||
        verseRangeEnd < 1 ||
        verseRangeEnd > verses.length)) ||
    (verseRangeStart !== null &&
      verseRangeEnd !== null &&
      verseRangeStart > verseRangeEnd)

  const filteredHighlights = highlights.filter((item) => {
    const matchesColor = highlightFilterColor === 'all' || item.color === highlightFilterColor
    const matchesTag = highlightFilterTag === 'all'
      ? true
      : highlightFilterTag === 'untagged'
        ? item.tags.length === 0
        : item.tags.includes(highlightFilterTag)
    return matchesColor && matchesTag
  })

  const filteredVerses = verseRangeInvalid
    ? []
    : verseFrom.trim() === '' && verseTo.trim() === ''
      ? verses
      : verses.filter((verse) => {
          const start = verseRangeStart ?? verseRangeEnd!
          const end = verseRangeEnd ?? verseRangeStart!

          return (
            verse.verseNumber >= start &&
            verse.verseNumber <= end
          )
        })

  async function goPrevious() {
    if (loading) return

    setVerseFrom('')
    setVerseTo('')

    if (chapter > 1) {
      setChapter((current) => current - 1)
      return
    }

    const bookIndex = books.findIndex((item) => item.name === book)

    if (bookIndex <= 0) return

    const previousBook = books[bookIndex - 1]

    try {
      const response = await apiFetch(
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
      setChapterInput(String(data.length))
    } catch (err) {
      try {
        const cached = await getOfflineChapters()
        const cachedForBook = cached.filter(
          (item) => item.translation === translation && item.book === previousBook.name,
        )
        if (cachedForBook.length > 0) {
          const lastChapter = Math.max(...cachedForBook.map((item) => item.chapterNumber))
          setBook(previousBook.name)
          setChapter(lastChapter)
          setChapterInput(String(lastChapter))
          setError('')
        } else {
          setError(err instanceof Error ? err.message : 'Navigation failed.')
        }
      } catch {
        setError(err instanceof Error ? err.message : 'Navigation failed.')
      }
    }
  }

  function goNext() {
    if (loading || chapterCount === 0) return

    setVerseFrom('')
    setVerseTo('')

    if (chapter < chapterCount) {
      setChapter((current) => current + 1)
      return
    }

    const bookIndex = books.findIndex((item) => item.name === book)
    const nextBook = books[bookIndex + 1]

    if (nextBook) {
      setBook(nextBook.name)
      setChapter(1)
      setChapterInput('1')
    }
  }

  const currentProgressKey = getProgressKey(translation, book, chapter)
  const currentChapterRead = readingProgress.some((item) => item.key === currentProgressKey)
  const currentTranslationProgress = readingProgress.filter((item) => item.translation === translation)

  function toggleCurrentChapterRead() {
    if (currentChapterRead) {
      setReadingProgress((current) => current.filter((item) => item.key !== currentProgressKey))
    } else {
      setReadingProgress((current) => [...current, { key: currentProgressKey, translation, book, chapterNumber: chapter, readAt: new Date().toISOString() }])
    }
  }

  function markBookReadProgress(bookName: string, total: number) {
    const chapterNumbers = Array.from({ length: total }, (_, index) => index + 1)
    setReadingProgress((current) => {
      const withoutBook = current.filter((item) => !(item.translation === translation && item.book === bookName))
      const alreadyRead = current.filter((item) => item.translation === translation && item.book === bookName)
      if (alreadyRead.length === total) return withoutBook
      return [...withoutBook, ...chapterNumbers.map((chapterNumber) => ({ key: getProgressKey(translation, bookName, chapterNumber), translation, book: bookName, chapterNumber, readAt: new Date().toISOString() }))]
    })
  }

  const bookIndex = books.findIndex((item) => item.name === book)

  const isFirstChapter = chapter <= 1 && bookIndex <= 0

  const isLastChapter =
    chapterCount > 0 &&
    chapter >= chapterCount &&
    bookIndex === books.length - 1

  async function downloadBibleForOffline() {
    if (downloadingBible) return
    if (!navigator.onLine) {
      setDownloadMessage('Connect to the internet before downloading the Bible.')
      return
    }

    setDownloadingBible(true)
    setDownloadProgress(0)
    setDownloadMessage('Preparing the KJV Bible download...')

    try {
      const translationCode = 'KJV'
      const bookResponse = await apiFetch('/api/books')
      if (!bookResponse.ok) throw new Error('Could not retrieve the Bible book list.')

      const bookData: Book[] = await bookResponse.json()
      if (!Array.isArray(bookData) || bookData.length === 0) {
        throw new Error('The server returned no Bible books.')
      }

      const chapterReferences: { book: string; chapterNumber: number }[] = []
      for (const item of bookData) {
        const response = await apiFetch(
          `/api/translations/${encodeURIComponent(translationCode)}` +
            `/books/${encodeURIComponent(item.name)}/chapters`,
        )
        if (!response.ok) throw new Error(`Could not retrieve chapters for ${item.name}.`)
        const chapterList: ChapterSummary[] = await response.json()
        if (!Array.isArray(chapterList)) throw new Error(`Invalid chapter list for ${item.name}.`)
        for (const entry of chapterList) {
          chapterReferences.push({ book: item.name, chapterNumber: entry.chapterNumber })
        }
      }

      if (chapterReferences.length === 0) throw new Error('No chapters were found to download.')

      let nextIndex = 0
      let completed = 0
      const worker = async () => {
        while (true) {
          const index = nextIndex++
          if (index >= chapterReferences.length) return
          if (!navigator.onLine) throw new Error('Internet connection lost. Reconnect and try the download again.')

          const item = chapterReferences[index]
          const chapterResponse = await apiFetch(
            `/api/translations/${encodeURIComponent(translationCode)}` +
              `/books/${encodeURIComponent(item.book)}/chapters/${item.chapterNumber}`,
          )
          if (!chapterResponse.ok) throw new Error(`Could not download ${item.book} ${item.chapterNumber}.`)

          const chapterData: Chapter = await chapterResponse.json()
          const versesResponse = await apiFetch(`/api/chapters/${chapterData.id}/verses`)
          if (!versesResponse.ok) throw new Error(`Could not download verses for ${item.book} ${item.chapterNumber}.`)

          const verseData: Verse[] = await versesResponse.json()
          if (!Array.isArray(verseData) || verseData.length === 0) {
            throw new Error(`No verses were returned for ${item.book} ${item.chapterNumber}.`)
          }

          await saveOfflineChapter({
            key: `${translationCode}|${item.book}|${item.chapterNumber}`,
            translation: translationCode,
            book: item.book,
            chapterNumber: item.chapterNumber,
            verses: verseData,
            savedAt: Date.now(),
          })

          completed++
          setDownloadProgress(Math.round((completed / chapterReferences.length) * 100))
          setDownloadMessage(`Downloading KJV: ${completed} of ${chapterReferences.length} chapters`)
        }
      }

      await Promise.all(Array.from({ length: 4 }, () => worker()))
      const count = await getOfflineChapterCount()
      setOfflineChapterCount(count)
      setTranslations([{ id: 1, abbreviation: 'KJV', name: 'King James Version' }])
      setBooks(bookData)
      setTranslation('KJV')
      setDownloadProgress(100)
      setDownloadMessage(`Download complete! ${count} chapters are saved on this device.`)
    } catch (err) {
      setDownloadMessage(err instanceof Error ? err.message : 'The Bible download failed.')
      getOfflineChapterCount().then(setOfflineChapterCount).catch(() => undefined)
    } finally {
      setDownloadingBible(false)
    }
  }

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
            type="button"
            className="theme-toggle"
            onClick={downloadBibleForOffline}
            disabled={downloadingBible}
            title="Save the KJV Bible to this device for offline use"
          >
            {downloadingBible ? `Downloading ${downloadProgress}%` : 'Download Bible'}
          </button>

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

      {(downloadMessage || offlineChapterCount > 0) && (
        <section className="offline-download-status" aria-live="polite">
          <div>
            <strong>Offline Bible</strong>
            <span>{offlineChapterCount} chapters saved on this device</span>
          </div>
          {downloadMessage && <p>{downloadMessage}</p>}
          {downloadingBible && (
            <progress value={downloadProgress} max={100}>
              {downloadProgress}%
            </progress>
          )}
        </section>
      )}

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
            value={chapterInput}
            onChange={(event) => setChapterInput(event.target.value)}
            onBlur={applyChapterInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
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
            onClick={() => changeBook('Genesis')}
          >
            <span>⌂</span> Beginning
          </button>

          <button
            className="sidebar-link"
            onClick={() => changeBook('Psalms')}
            disabled={!books.some((item) => item.name === 'Psalms')}
          >
            <span>♫</span> Psalms
          </button>

          <button
            className="sidebar-link"
            onClick={() => changeBook('John')}
            disabled={!books.some((item) => item.name === 'John')}
          >
            <span>✧</span> Gospel of John
          </button>

          <div className="sidebar-divider" />

          <p className="sidebar-heading">PERSONAL STUDY</p>

          <button
            className="sidebar-link"
            onClick={() => setShowSavedVerses((current) => !current)}
          >
            <span>★</span>
            Saved Verses
          </button>
          <button className="sidebar-link" onClick={() => setShowSavedVerses(true)}>
            <span>✎</span> Highlights &amp; Tags
          </button>

          <button className="sidebar-link" onClick={() => setShowReadingProgress(true)}>
            <span>✓</span> Reading Progress
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

          {/* Personal Study opens in its own overlay so it does not crowd the reader. */}
          {showSavedVerses && (
            <div
              className="personal-study-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setShowSavedVerses(false)
              }}
            >
              <section
                className="personal-study-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="personal-study-title"
              >
                <div className="personal-study-modal-header">
                  <div>
                    <p className="eyebrow">WORD &amp; WISDOM</p>
                    <h2 id="personal-study-title">Personal Study</h2>
                    <p>Save passages and keep your personal reflections in one place.</p>
                  </div>
                  <button
                    type="button"
                    className="nav-button"
                    onClick={() => setShowSavedVerses(false)}
                    aria-label="Close Personal Study"
                  >
                    Close
                  </button>
                </div>

                <form className="save-reference-form" onSubmit={saveTypedReference}>
                  <label className="field-label" htmlFor="save-reference">Bible reference</label>
                  <div className="save-reference-controls">
                    <input
                      id="save-reference"
                      className="search-input"
                      type="text"
                      value={saveReference}
                      onChange={(event) => {
                        setSaveReference(event.target.value)
                        setSaveReferenceError('')
                        setSaveReferenceStatus('')
                      }}
                      placeholder="e.g. John 3:16 or Psalm 23:1-3"
                      aria-describedby="save-reference-help"
                    />
                    <button className="search-button" type="submit">Save passage</button>
                  </div>
                  <p id="save-reference-help" className="save-reference-help">
                    Enter Book Chapter:Verse or Book Chapter:Start-End. The selected translation is {translation}.
                  </p>
                  {saveReferenceError && <p className="search-error" role="alert">{saveReferenceError}</p>}
                  {saveReferenceStatus && <p className="save-reference-status" role="status">{saveReferenceStatus}</p>}
                </form>

                <section className="highlight-library" aria-labelledby="highlights-tags-title">
                  <div className="highlight-library-heading">
                    <div>
                      <h3 id="highlights-tags-title">Highlights &amp; Tags</h3>
                      <p>Color-code meaningful verses and organize them with tags.</p>
                    </div>
                    <span>{highlights.length} highlighted {highlights.length === 1 ? 'verse' : 'verses'}</span>
                  </div>

                  <form className="custom-tag-form" onSubmit={addCustomTag}>
                    <label className="field-label" htmlFor="new-custom-tag">Create a custom tag</label>
                    <div className="save-reference-controls">
                      <input id="new-custom-tag" className="search-input" value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="e.g. Gratitude or Forgiveness" maxLength={32} />
                      <button className="search-button" type="submit" disabled={!newTag.trim()}>Add tag</button>
                    </div>
                    <p className="save-reference-help">Available tags: {[...BUILT_IN_TAGS, ...customTags].join(', ')}</p>
                  </form>

                  <div className="highlight-filters">
                    <label className="field-label" htmlFor="highlight-color-filter">Filter by color</label>
                    <select id="highlight-color-filter" className="field-control" value={highlightFilterColor} onChange={(event) => setHighlightFilterColor(event.target.value)}>
                      <option value="all">All colors</option>
                      {HIGHLIGHT_COLORS.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}
                    </select>
                    <label className="field-label" htmlFor="highlight-tag-filter">Filter by tag</label>
                    <select id="highlight-tag-filter" className="field-control" value={highlightFilterTag} onChange={(event) => setHighlightFilterTag(event.target.value)}>
                      <option value="all">All tags</option>
                      {[...BUILT_IN_TAGS, ...customTags].map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                      <option value="untagged">Untagged</option>
                    </select>
                  </div>

                  {highlights.length === 0 ? (
                    <p className="highlight-empty">No highlights yet. Select text in a verse, then choose a highlight color to save it here.</p>
                  ) : (
                    <div className="highlight-list">
                      {highlights.filter((item) => (highlightFilterColor === 'all' || item.color === highlightFilterColor) && (highlightFilterTag === 'all' || (highlightFilterTag === 'untagged' ? item.tags.length === 0 : item.tags.includes(highlightFilterTag)))).sort((a, b) => a.book.localeCompare(b.book) || a.chapterNumber - b.chapterNumber || a.verseNumber - b.verseNumber).map((item) => {
                        return (
                          <article className="highlight-card" key={item.key}>
                            <div className="highlight-card-top">
                              <button type="button" className="saved-verse-reference" onClick={() => openHighlightedVerse(item)}>{item.book} {item.chapterNumber}:{item.verseNumber} <span>· {item.translation}</span></button>
                              <button type="button" className="remove-saved-verse" onClick={() => removeHighlight(item.key)}>Remove</button>
                            </div>
                            <button type="button" className="highlight-verse-text" style={{ backgroundColor: getHighlightHex(item.color), color: darkMode ? '#f7f4e8' : '#302f27' }} onClick={() => openHighlightedVerse(item)}>{item.verseText}</button>
                            <div className="highlight-card-color-row"><span>Highlight color</span><div className="highlight-color-options">{HIGHLIGHT_COLORS.map((option) => <button key={option.value} type="button" title={option.label} aria-label={`Set ${item.book} ${item.chapterNumber}:${item.verseNumber} highlight to ${option.label}`} aria-pressed={item.color === option.value} className={`highlight-color-button ${item.color === option.value ? 'is-selected' : ''}`} style={{ backgroundColor: option.hex }} onClick={() => setHighlights((current) => current.map((entry) => entry.key === item.key ? { ...entry, color: option.value } : entry))} />)}</div></div>
                            <div className="highlight-tags"><span className="highlight-tags-label">Tags</span>{[...BUILT_IN_TAGS, ...customTags].map((tag) => <label className={`highlight-tag-option ${item.tags.includes(tag) ? 'is-checked' : ''}`} key={tag}><input type="checkbox" checked={item.tags.includes(tag)} onChange={() => toggleHighlightTag(item.key, tag)} />{tag}</label>)}</div>
                          </article>
                        )
                      })}
                      {filteredHighlights.length === 0 && <p className="highlight-empty">No highlights match those filters.</p>}
                    </div>
                  )}
                </section>

                {savedVerses.length === 0 ? (
                  <div className="personal-study-empty">
                    <span aria-hidden="true">✦</span>
                    <h3>Your study library is empty</h3>
                    <p>Type a Bible reference above to save a passage for later.</p>
                  </div>
                ) : (
                  <div className="saved-books-list">
                    {Array.from(new Set(savedVerses.map((saved) => saved.book)))
                      .sort((a, b) => {
                        const indexA = books.findIndex((item) => item.name === a)
                        const indexB = books.findIndex((item) => item.name === b)
                        if (indexA === -1 && indexB === -1) return a.localeCompare(b)
                        if (indexA === -1) return 1
                        if (indexB === -1) return -1
                        return indexA - indexB
                      })
                      .map((savedBookName) => {
                        const versesForBook = savedVerses
                          .filter((saved) => saved.book === savedBookName)
                          .sort((a, b) => a.chapterNumber - b.chapterNumber || a.verseNumber - b.verseNumber)

                        return (
                          <section className="saved-book-group" key={savedBookName}>
                            <h3 className="saved-book-title">
                              <span className="saved-book-name">{savedBookName}</span>
                              <span className="saved-book-count">
                                {versesForBook.length} saved {versesForBook.length === 1 ? 'verse' : 'verses'}
                              </span>
                            </h3>
                            <div className="saved-book-verses">
                              {versesForBook.map((saved) => (
                                <article className="saved-verse-card" key={saved.key}>
                                  <div className="saved-verse-heading">
                                    <button
                                      type="button"
                                      className="saved-verse-reference"
                                      onClick={() => openSavedVerse(saved)}
                                    >
                                      {saved.book} {saved.chapterNumber}:{saved.verseNumber} <span>· {saved.translation}</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="remove-saved-verse"
                                      onClick={() => setSavedVerses((current) => current.filter((item) => item.key !== saved.key))}
                                      aria-label={`Remove ${saved.book} ${saved.chapterNumber}:${saved.verseNumber} from Personal Study`}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    className="saved-verse-open-text"
                                    onClick={() => openSavedVerse(saved)}
                                  >
                                    {saved.verseText}
                                  </button>
                                  <label className="field-label" htmlFor={`note-${saved.key}`}>Personal reflection</label>
                                  <textarea
                                    id={`note-${saved.key}`}
                                    className="note-input"
                                    rows={3}
                                    placeholder="Write your thoughts or reflection..."
                                    value={noteDrafts[saved.key] ?? saved.note}
                                    onChange={(event) => {
                                      const note = event.target.value
                                      setNoteDrafts((current) => ({ ...current, [saved.key]: note }))
                                      updateNote(saved.key, note)
                                    }}
                                  />
                                  <p className="note-save-status">Your reflection is saved automatically.</p>
                                </article>
                              ))}
                            </div>
                          </section>
                        )
                      })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Advanced Bible search */}
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

              <div className="search-filters">
                <label className="field-label" htmlFor="search-book">
                  Search in book
                </label>

                <select
                  id="search-book"
                  className="field-control"
                  value={searchBook}
                  onChange={(event) => setSearchBook(event.target.value)}
                >
                  <option value="">All books</option>
                  {books.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <label className="exact-phrase-option">
                  <input
                    type="checkbox"
                    checked={exactPhrase}
                    onChange={(event) => setExactPhrase(event.target.checked)}
                  />{' '}
                  Exact phrase
                </label>
              </div>
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
                  {totalResults === 0
                    ? 'No matching verses found.'
                    : `${totalResults} matching verse${
                        totalResults === 1 ? '' : 's'
                      } found`}
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

                {totalPages > 1 && (
                  <div className="search-pagination">
                    <button
                      type="button"
                      className="nav-button"
                      disabled={searchPage === 0 || searchLoading}
                      onClick={() => runBibleSearch(searchPage - 1)}
                    >
                      Previous
                    </button>

                    <span>
                      Page {searchPage + 1} of {totalPages}
                    </span>

                    <button
                      type="button"
                      className="nav-button"
                      disabled={
                        searchPage >= totalPages - 1 || searchLoading
                      }
                      onClick={() => runBibleSearch(searchPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
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

          {/* Verse range selector */}
          <div className="verse-range-selector">
            <label className="field-label" htmlFor="verse-from">
              Verse from
            </label>

            <input
              id="verse-from"
              className="field-control"
              type="number"
              min="1"
              max={verses.length || undefined}
              step="1"
              placeholder="Start verse"
              value={verseFrom}
              onChange={(event) => setVerseFrom(event.target.value)}
              disabled={loading || verses.length === 0}
            />

            <label className="field-label" htmlFor="verse-to">
              Verse to
            </label>

            <input
              id="verse-to"
              className="field-control"
              type="number"
              min="1"
              max={verses.length || undefined}
              step="1"
              placeholder="End verse"
              value={verseTo}
              onChange={(event) => setVerseTo(event.target.value)}
              disabled={loading || verses.length === 0}
            />

            <p className="verse-range-help">
              Leave both fields empty to read the entire chapter. Enter the same
              number in both fields to read one verse. Filling only one field
              also selects that single verse.
            </p>

            {verseRangeInvalid && (
              <p className="search-error" role="alert">
                Enter valid verse numbers within this chapter. The starting
                verse must not exceed the ending verse.
              </p>
            )}
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
              <>
                {verseRangeInvalid ? (
                  <p className="empty-state">
                    Please correct the verse range above.
                  </p>
                ) : filteredVerses.length === 0 ? (
                  <p className="empty-state">
                    No verses match your selection.
                  </p>
                ) : (
                  <div className="verses">
                    {filteredVerses.map((verse) => {
                      const segments = getTextHighlightSegments(verse)
                      return (
                        <div className="verse-study-row" key={verse.id}>
                          <p className="verse">
                            <sup>{verse.verseNumber}</sup>
                            <span className="verse-selectable-text" onMouseUp={(event) => scheduleCaptureSelectedText(verse, event.currentTarget, 0)} onTouchEnd={(event) => scheduleCaptureSelectedText(verse, event.currentTarget, 80)}>
                              {segments.map((segment, index) => {
                                const color = segment.color ? HIGHLIGHT_COLORS.find((item) => item.value === segment.color) : undefined
                                return color
                                  ? <mark key={`${segment.start}-${segment.end}-${index}`} className={`text-highlight text-highlight-${segment.color}`} style={{ backgroundColor: getHighlightHex(color.value), color: darkMode ? '#f7f4e8' : 'inherit' }}>{segment.text}</mark>
                                  : <span key={`${segment.start}-${segment.end}-${index}`}>{segment.text}</span>
                              })}
                            </span>
                          </p>
                        </div>
                      )
                    })}
                    {pendingTextSelection && (
                      <div className="selection-highlight-toolbar" role="group" aria-label="Highlight selected text">
                        <div className="selection-toolbar-copy">
                          <strong>Highlight selected text</strong>
                          <span>Choose a color for the text you selected.</span>
                        </div>
                        <div className="highlight-color-options">
                          {HIGHLIGHT_COLORS.map((color) => (
                            <button type="button" key={color.value} className="highlight-color-button" style={{ backgroundColor: color.hex }} title={`Highlight selected text ${color.label.toLowerCase()}`} aria-label={`Highlight selected text ${color.label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => saveSelectedTextHighlight(color.value)} />
                          ))}
                        </div>
                        <button type="button" className="selection-toolbar-cancel" onClick={() => { setPendingTextSelection(null); window.getSelection()?.removeAllRanges() }}>Cancel</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </article>

          <div className="reading-progress-action">
            <div>
              <strong>{currentChapterRead ? 'Chapter completed' : 'Finished this chapter?'}</strong>
              <p>{currentChapterRead ? 'This chapter is included in your reading progress.' : 'Mark this chapter as read to track your progress.'}</p>
            </div>
            <button type="button" className={`progress-toggle ${currentChapterRead ? 'is-read' : ''}`} onClick={toggleCurrentChapterRead}>
              {currentChapterRead ? '✓ Mark as unread' : 'Mark chapter as read'}
            </button>
          </div>

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
      {showReadingProgress && (
        <div className="personal-study-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReadingProgress(false) }}>
          <section className="personal-study-modal progress-modal" role="dialog" aria-modal="true" aria-labelledby="reading-progress-title">
            <div className="personal-study-modal-header">
              <div>
                <p className="eyebrow">WORD &amp; WISDOM</p>
                <h2 id="reading-progress-title">Bible Reading Progress</h2>
                <p>Track the chapters you have completed in each translation. Your progress is saved in this browser.</p>
              </div>
              <button type="button" className="nav-button" onClick={() => setShowReadingProgress(false)}>Close</button>
            </div>
            <div className="progress-summary">
              <span className="progress-summary-number">{currentTranslationProgress.length}</span>
              <span>chapters marked as read in {translation}</span>
            </div>
            <p className="progress-note">Progress is tracked separately for each translation. Use “Mark chapter as read” while reading, or use the buttons below to mark an entire book.</p>
            <div className="progress-book-list">
              {books.map((item) => {
                const readCount = currentTranslationProgress.filter((entry) => entry.book === item.name).length
                const total = item.name === book ? chapterCount : 0
                const pct = total > 0 ? Math.round((Math.min(readCount, total) / total) * 100) : 0
                return (
                  <div className="progress-book-row" key={item.id}>
                    <div className="progress-book-info">
                      <strong>{item.name}</strong>
                      <span>{readCount} {readCount === 1 ? 'chapter' : 'chapters'} marked read{total > 0 ? ` · ${pct}% of ${total}` : ''}</span>
                    </div>
                    <button type="button" className="progress-book-action" onClick={() => {
                      if (item.name === book && chapterCount > 0) markBookReadProgress(item.name, chapterCount)
                      else { setBook(item.name); setChapter(1); setChapterInput('1'); setShowReadingProgress(false) }
                    }}>{item.name === book && chapterCount > 0 ? (readCount === chapterCount ? 'Reset book' : 'Mark book read') : 'Open book'}</button>
                  </div>
                )
              })}
            </div>
            <div className="progress-modal-footer">
              <button type="button" className="remove-saved-verse" onClick={() => { if (window.confirm(`Clear all reading progress for ${translation}?`)) setReadingProgress((current) => current.filter((item) => item.translation !== translation)) }}>Clear {translation} progress</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App