import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  insertFile,
  getFileById,
  getAllFiles,
  getPublicFiles,
  getPopularHashtags,
  toggleLike,
  getLikeCount,
  hasUserLiked,
  getLikeStats,
  addComment,
  getComments,
  getCommentCount,
  deleteComment,
  getSocialStats,
  createFolder,
  getFoldersByUser,
  deleteFolder,
  getFilesByFolder,
  getAllUserFiles
} from '../../lib/dbSchema'
import sql from '../../lib/neonClient'

describe('Database Schema Helpers', () => {
  const testUserId = '00000000-0000-0000-0000-000000000002'
  let seededFileId = ''
  let seededFolderId = ''

  beforeEach(async () => {
    // Cleanup any stale records
    await sql`DELETE FROM comments WHERE user_id = ${testUserId}`
    await sql`DELETE FROM likes WHERE user_id = ${testUserId}`
    await sql`DELETE FROM files WHERE user_id = ${testUserId}`
    await sql`DELETE FROM folders WHERE user_id = ${testUserId}`
    await sql`DELETE FROM "user" WHERE id = ${testUserId}`

    // Seed test user to satisfy foreign keys
    await sql`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      VALUES (${testUserId}, 'DB Tester', 'dbtest@example.com', true, NOW(), NOW())
    `
  })

  afterEach(async () => {
    // Clean up in reverse FK order
    await sql`DELETE FROM comments WHERE user_id = ${testUserId}`
    await sql`DELETE FROM likes WHERE user_id = ${testUserId}`
    if (seededFileId) {
      await sql`DELETE FROM files WHERE id = ${seededFileId}`
    }
    if (seededFolderId) {
      await sql`DELETE FROM folders WHERE id = ${seededFolderId}`
    }
    await sql`DELETE FROM "user" WHERE id = ${testUserId}`
  })

  it('performs core files CRUD and filtering helper checks', async () => {
    const file = await insertFile(
      'Test DB Schema File',
      'https://res.cloudinary.com/dummy-url/schema.md',
      'md',
      1024,
      'DB Author',
      true,
      ['schema', 'test'],
      testUserId,
      undefined,
      'registered'
    )
    seededFileId = file.id

    expect(file.title).toBe('Test DB Schema File')

    const retrieved = await getFileById(file.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved.title).toBe('Test DB Schema File')

    const publicFiles = await getPublicFiles('Test DB Schema')
    expect(publicFiles.length).toBeGreaterThanOrEqual(1)

    const allFiles = await getAllFiles()
    expect(allFiles.length).toBeGreaterThanOrEqual(1)

    const popularTags = await getPopularHashtags()
    expect(popularTags.length).toBeGreaterThanOrEqual(1)
  })

  it('performs likes and social statistics checks', async () => {
    const file = await insertFile(
      'Like Test File',
      'https://res.cloudinary.com/dummy-url/like.md',
      'md',
      100,
      'Author',
      true,
      [],
      testUserId
    )
    seededFileId = file.id

    // 1. Initially no likes
    let stats = await getLikeStats(seededFileId, testUserId)
    expect(stats.count).toBe(0)
    expect(stats.userHasLiked).toBe(false)

    // 2. Toggle like on
    const status1 = await toggleLike(seededFileId, testUserId)
    expect(status1.liked).toBe(true)

    stats = await getLikeStats(seededFileId, testUserId)
    expect(stats.count).toBe(1)
    expect(stats.userHasLiked).toBe(true)

    // Check count and boolean directly
    expect(await getLikeCount(seededFileId)).toBe(1)
    expect(await hasUserLiked(seededFileId, testUserId)).toBe(true)

    // 3. Toggle like off
    const status2 = await toggleLike(seededFileId, testUserId)
    expect(status2.liked).toBe(false)
    expect(await getLikeCount(seededFileId)).toBe(0)
  })

  it('performs comments CRUD and comment stats checks', async () => {
    const file = await insertFile(
      'Comment Test File',
      'https://res.cloudinary.com/dummy-url/comment.md',
      'md',
      100,
      'Author',
      true,
      [],
      testUserId
    )
    seededFileId = file.id

    // 1. Add comment
    const comment = await addComment(seededFileId, testUserId, 'This is a test comment!')
    expect(comment.content).toBe('This is a test comment!')

    // 2. Verify stats and listing
    expect(await getCommentCount(seededFileId)).toBe(1)
    const commentsList = await getComments(seededFileId)
    expect(commentsList.length).toBe(1)
    expect(commentsList[0].content).toBe('This is a test comment!')

    const social = await getSocialStats(seededFileId, testUserId)
    expect(social.commentCount).toBe(1)

    // 3. Delete comment
    const deleted = await deleteComment(comment.id, testUserId)
    expect(deleted).toBe(true)
    expect(await getCommentCount(seededFileId)).toBe(0)
  })

  it('performs workspace folders CRUD and mapping checks', async () => {
    // 1. Create folder
    const folder = await createFolder('My Test Workspace', testUserId)
    seededFolderId = folder.id
    expect(folder.name).toBe('My Test Workspace')

    // 2. Get folder by user
    const folders = await getFoldersByUser(testUserId)
    expect(folders.length).toBe(1)
    expect(folders[0].name).toBe('My Test Workspace')

    // 3. Associate file with folder and verify
    const file = await insertFile(
      'Folder Associated File',
      'https://res.cloudinary.com/dummy-url/folder-file.md',
      'md',
      200,
      'Author',
      false,
      [],
      testUserId,
      undefined,
      'registered',
      seededFolderId
    )
    seededFileId = file.id

    const folderFiles = await getFilesByFolder(seededFolderId, testUserId)
    expect(folderFiles.length).toBe(1)
    expect(folderFiles[0].title).toBe('Folder Associated File')

    const userFiles = await getAllUserFiles(testUserId)
    expect(userFiles.length).toBe(1)

    // 4. Delete folder
    const deleted = await deleteFolder(seededFolderId, testUserId)
    expect(deleted).toBe(true)
    
    // Stale folder is deleted
    const postDeleteFolders = await getFoldersByUser(testUserId)
    expect(postDeleteFolders.length).toBe(0)
    seededFolderId = ''
  })
})
