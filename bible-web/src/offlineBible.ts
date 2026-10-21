
const DB_NAME = 'word-and-wisdom-offline'
const DB_VERSION = 1
const STORE_NAME = 'chapters'

export type OfflineVerse = {
  id: number
  verseNumber: number
  verseText: string
}

export type OfflineChapter = {
  key: string
  translation: string
  book: string
  chapterNumber: number
  verses: OfflineVerse[]
  savedAt: number
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Offline storage is not supported in this browser.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(
      request.error ?? new Error('Could not open offline storage.'),
    )
  })
}

export async function saveOfflineChapter(
  chapter: OfflineChapter,
): Promise<void> {
  const db = await openDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')

      transaction.objectStore(STORE_NAME).put({
        ...chapter,
        savedAt: Date.now(),
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(
        transaction.error ?? new Error('Could not save chapter.'),
      )
      transaction.onabort = () => reject(
        transaction.error ?? new Error('Saving chapter was cancelled.'),
      )
    })
  } finally {
    db.close()
  }
}

export async function getOfflineChapter(
  translation: string,
  book: string,
  chapterNumber: number,
): Promise<OfflineChapter | null> {
  const db = await openDatabase()
  const key = `${translation}|${book}|${chapterNumber}`

  try {
    return await new Promise<OfflineChapter | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(key)

      request.onsuccess = () => resolve(
        (request.result as OfflineChapter | undefined) ?? null,
      )
      request.onerror = () => reject(
        request.error ?? new Error('Could not read offline chapter.'),
      )
    })
  } finally {
    db.close()
  }
}

export async function getOfflineChapters(): Promise<OfflineChapter[]> {
  const db = await openDatabase()

  try {
    return await new Promise<OfflineChapter[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).getAll()

      request.onsuccess = () => resolve(
        request.result as OfflineChapter[],
      )
      request.onerror = () => reject(
        request.error ?? new Error('Could not list offline chapters.'),
      )
    })
  } finally {
    db.close()
  }
}

export async function getOfflineChapterCount(): Promise<number> {
  const db = await openDatabase()

  try {
    return await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(
        request.error ?? new Error('Could not count offline chapters.'),
      )
    })
  } finally {
    db.close()
  }
}

export async function clearOfflineBible(): Promise<void> {
  const db = await openDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).clear()

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(
        transaction.error ?? new Error('Could not clear offline Bible.'),
      )
    })
  } finally {
    db.close()
  }
}
