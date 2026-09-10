CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  preferred_name text,
  language text NOT NULL DEFAULT 'hu' CHECK (language IN ('hu','en')),
  reminder_sound text NOT NULL DEFAULT 'gentle',
  sound_mime text,
  sound_data bytea,
  password_hash text,
  google_id text UNIQUE,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  category text NOT NULL CHECK (category IN ('Tanulás', 'Otthon', 'Munka', 'Saját')),
  due_at timestamptz,
  reminder_at timestamptz,
  reminder_minutes integer,
  recurrence jsonb,
  completed_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  done boolean NOT NULL DEFAULT false,
  deleted boolean NOT NULL DEFAULT false,
  client_updated_at timestamptz NOT NULL,
  server_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_user_server_updated_idx ON tasks(user_id, server_updated_at);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_minutes integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_dates jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'hu';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_language_check;
ALTER TABLE users ADD CONSTRAINT users_language_check CHECK (language IN ('hu','en','uk'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_sound text NOT NULL DEFAULT 'gentle';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sound_mime text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sound_data bytea;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_hash_idx ON password_reset_tokens(token_hash);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reminder_deliveries (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(task_id, occurrence_date)
);

CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(sender_id, receiver_id, created_at);

