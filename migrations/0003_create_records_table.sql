CREATE TABLE IF NOT EXISTS records (
    record_id TEXT PRIMARY KEY NOT NULL,
    performance_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    outfit_id INTEGER,
    frame_count INTEGER NOT NULL,
    record_duration TEXT NOT NULL,
    animation_tracks BLOB NOT NULL,          -- gzipped JSON array of strings
    frame_interval_map BLOB NOT NULL,        -- gzipped JSON array of strings
    frame_times BLOB NOT NULL,               -- gzipped JSON array of strings/numbers
    frames BLOB NOT NULL,                    -- gzipped JSON array of frame objects
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);