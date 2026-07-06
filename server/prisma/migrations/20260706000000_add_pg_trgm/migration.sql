-- Enable pg_trgm extension for trigram-based fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram GIN indexes for efficient ILIKE and similarity searches on frequently searched text columns
CREATE INDEX IF NOT EXISTS "Book_title_trgm_idx" ON "Book" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Book_author_trgm_idx" ON "Book" USING gin (COALESCE(author, '') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Book_isbn_trgm_idx" ON "Book" USING gin (COALESCE(isbn, '') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Category_name_trgm_idx" ON "Category" USING gin (name gin_trgm_ops);
