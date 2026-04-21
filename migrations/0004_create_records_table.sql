CREATE TABLE IF NOT EXISTS records (
    record_id TEXT PRIMARY KEY NOT NULL,
    performance_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    outfit_id INTEGER,
    frame_count INTEGER NOT NULL,
    record_duration INTEGER NOT NULL,
    data_blob BLOB NOT NULL,            -- gzipped MessagePack of { frames, frameTimes, frameIntervalMap, animationTracks }
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);