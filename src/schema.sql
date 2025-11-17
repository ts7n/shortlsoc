CREATE TABLE links (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  creator TEXT NOT NULL,
  destination TEXT NOT NULL,
  created_at TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0
);