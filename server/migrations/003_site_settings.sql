-- Migration 003: Admin-managed homepage content
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO site_settings (setting_key, setting_value)
VALUES (
  'home_content',
  JSON_OBJECT(
    'heroMode', 'auto',
    'heroProductId', NULL,
    'heroEyebrow', '',
    'heroTitle', '',
    'heroSubtitle', '',
    'heroImageUrl', '',
    'heroButtonLabel', 'Acheter maintenant',
    'featuredProductIds', JSON_ARRAY()
  )
)
ON DUPLICATE KEY UPDATE setting_key = setting_key;
