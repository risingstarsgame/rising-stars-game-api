CREATE TABLE IF NOT EXISTS model_exports (
    id TEXT PRIMARY KEY NOT NULL, -- 12-digit numeric UUID
    player_user_id INTEGER NOT NULL,
    serialized_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Index for faster queries by player_user_id
    INDEX idx_player_user_id (player_user_id)
);