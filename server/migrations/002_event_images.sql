CREATE TABLE event_images (
 id CHAR(36) PRIMARY KEY,
 mime_type ENUM('image/jpeg','image/png','image/webp') NOT NULL,
 image_data LONGBLOB NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
