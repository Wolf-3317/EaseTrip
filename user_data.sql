-- same databse as folder file
SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @OLD_UNIQUE_CHECKS = @@UNIQUE_CHECKS;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET @OLD_SQL_MODE = @@SQL_MODE;

SET UNIQUE_CHECKS = 0;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

CREATE DATABASE IF NOT EXISTS easetrip
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE easetrip;

-- Drop tables 
DROP TABLE IF EXISTS listing_images;
DROP TABLE IF EXISTS listing_amenities;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS amenities;
DROP TABLE IF EXISTS weather_data;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS users;

-- =========================
-- Tables
-- =========================

CREATE TABLE users (
  id INT(11) NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  avatar VARCHAR(255) DEFAULT '/images/default-avatar.png',
  role ENUM('customer','host','admin') DEFAULT 'customer',
  status ENUM('pending','active','suspended','banned') DEFAULT 'active',
  bio TEXT DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  identity_verified TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE listings (
  id INT(11) NOT NULL AUTO_INCREMENT,
  host_id INT(11) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  type ENUM('accommodation','activity','event') DEFAULT 'accommodation',
  category VARCHAR(50) DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL,
  address VARCHAR(255) DEFAULT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) DEFAULT NULL,
  postal_code VARCHAR(20) DEFAULT NULL,
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  max_guests INT(11) DEFAULT 1,
  bedrooms INT(11) DEFAULT 1,
  bathrooms INT(11) DEFAULT 1,
  status ENUM('pending','active','delisted','rejected') DEFAULT 'pending',
  is_featured TINYINT(1) DEFAULT 0,
  view_count INT(11) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY host_id (host_id),
  CONSTRAINT listings_ibfk_1 FOREIGN KEY (host_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE amenities (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT NULL,
  category VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE bookings (
  id INT(11) NOT NULL AUTO_INCREMENT,
  listing_id INT(11) NOT NULL,
  customer_id INT(11) NOT NULL,
  host_id INT(11) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT(11) DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('pending','confirmed','cancelled','completed','rejected') DEFAULT 'pending',
  special_requests TEXT DEFAULT NULL,
  cancelled_at TIMESTAMP NULL DEFAULT NULL,
  cancellation_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY listing_id (listing_id),
  KEY customer_id (customer_id),
  KEY host_id (host_id),
  CONSTRAINT bookings_ibfk_1 FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE,
  CONSTRAINT bookings_ibfk_2 FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT bookings_ibfk_3 FOREIGN KEY (host_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE favorites (
  id INT(11) NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  listing_id INT(11) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_listing (user_id, listing_id),
  KEY listing_id (listing_id),
  CONSTRAINT favorites_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT favorites_ibfk_2 FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE listing_amenities (
  listing_id INT(11) NOT NULL,
  amenity_id INT(11) NOT NULL,
  PRIMARY KEY (listing_id, amenity_id),
  KEY amenity_id (amenity_id),
  CONSTRAINT listing_amenities_ibfk_1 FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE,
  CONSTRAINT listing_amenities_ibfk_2 FOREIGN KEY (amenity_id) REFERENCES amenities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE listing_images (
  id INT(11) NOT NULL AUTO_INCREMENT,
  listing_id INT(11) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  display_order INT(11) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY listing_id (listing_id),
  CONSTRAINT listing_images_ibfk_1 FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE messages (
  id INT(11) NOT NULL AUTO_INCREMENT,
  sender_id INT(11) NOT NULL,
  receiver_id INT(11) NOT NULL,
  booking_id INT(11) DEFAULT NULL,
  subject VARCHAR(255) DEFAULT NULL,
  content TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  is_system_message TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY sender_id (sender_id),
  KEY receiver_id (receiver_id),
  KEY booking_id (booking_id),
  CONSTRAINT messages_ibfk_1 FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT messages_ibfk_2 FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT messages_ibfk_3 FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE reviews (
  id INT(11) NOT NULL AUTO_INCREMENT,
  booking_id INT(11) NOT NULL,
  listing_id INT(11) NOT NULL,
  customer_id INT(11) NOT NULL,
  rating INT(11) NOT NULL,
  comment TEXT DEFAULT NULL,
  cleanliness_rating INT(11) DEFAULT NULL,
  communication_rating INT(11) DEFAULT NULL,
  location_rating INT(11) DEFAULT NULL,
  value_rating INT(11) DEFAULT NULL,
  is_reported TINYINT(1) DEFAULT 0,
  report_reason TEXT DEFAULT NULL,
  status ENUM('active','hidden','removed') DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY booking_id (booking_id),
  KEY listing_id (listing_id),
  KEY customer_id (customer_id),
  CONSTRAINT reviews_ibfk_1 FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT reviews_ibfk_2 FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE,
  CONSTRAINT reviews_ibfk_3 FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_reviews_rating CHECK (rating >= 1 AND rating <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE reports (
  id INT(11) NOT NULL AUTO_INCREMENT,
  reporter_id INT(11) NOT NULL,
  reported_user_id INT(11) DEFAULT NULL,
  reported_listing_id INT(11) DEFAULT NULL,
  reported_review_id INT(11) DEFAULT NULL,
  type ENUM('user','listing','review') NOT NULL,
  reason VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  status ENUM('pending','reviewed','resolved','dismissed') DEFAULT 'pending',
  admin_notes TEXT DEFAULT NULL,
  resolved_by INT(11) DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY reporter_id (reporter_id),
  KEY reported_user_id (reported_user_id),
  KEY reported_listing_id (reported_listing_id),
  KEY reported_review_id (reported_review_id),
  KEY resolved_by (resolved_by),
  CONSTRAINT reports_ibfk_1 FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT reports_ibfk_2 FOREIGN KEY (reported_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT reports_ibfk_3 FOREIGN KEY (reported_listing_id) REFERENCES listings (id) ON DELETE SET NULL,
  CONSTRAINT reports_ibfk_4 FOREIGN KEY (reported_review_id) REFERENCES reviews (id) ON DELETE SET NULL,
  CONSTRAINT reports_ibfk_5 FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE weather_data (
  id INT(11) NOT NULL AUTO_INCREMENT,
  city VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  condition_main VARCHAR(50) DEFAULT NULL,
  condition_description VARCHAR(100) DEFAULT NULL,
  icon VARCHAR(20) DEFAULT NULL,
  temp_current DECIMAL(5,2) DEFAULT NULL,
  temp_high DECIMAL(5,2) DEFAULT NULL,
  temp_low DECIMAL(5,2) DEFAULT NULL,
  humidity INT(11) DEFAULT NULL,
  wind_speed DECIMAL(5,2) DEFAULT NULL,
  is_admin_set TINYINT(1) DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_city_date (city, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================
-- Seed data
-- =========================

INSERT INTO amenities (id, name, icon, category) VALUES
(1,'WiFi','wifi','essentials'),
(2,'Air Conditioning','snowflake','essentials'),
(3,'Kitchen','utensils','essentials'),
(4,'Washing Machine','soap','essentials'),
(5,'TV','tv','essentials'),
(6,'Free Parking','car','parking'),
(7,'Swimming Pool','swimmer','outdoor'),
(8,'Gym','dumbbell','outdoor'),
(9,'Beach Access','umbrella-beach','outdoor'),
(10,'Garden','leaf','outdoor'),
(11,'BBQ Grill','fire','outdoor'),
(12,'Hot Tub','hot-tub','outdoor'),
(13,'Breakfast Included','coffee','dining'),
(14,'Workspace','laptop','work'),
(15,'Security Camera','video','safety'),
(16,'First Aid Kit','first-aid','safety'),
(17,'Fire Extinguisher','fire-extinguisher','safety'),
(18,'Smoke Alarm','bell','safety');

INSERT INTO users (id, email, password, name, phone, avatar, role, status, bio, address, identity_verified, created_at, updated_at) VALUES
(1,'admin@gmail.com','$2a$10$kKKqQnOMXAtEdA7MWtv9xuA3ccVvdp8GtQlh3eu1286i/vTHygkLa','Admin',NULL,'/images/default-avatar.png','admin','active',NULL,NULL,1,'2025-12-19 12:07:01','2025-12-19 12:07:01'),
(2,'host@gmail.com','$2a$10$EOwfclUokcAhTm0oLCKubeovdNo4Qn5Zbn5VfZ8zWSniogIDG6XoS','Sarah Coner','+60198765432','/images/default-avatar.png','host','active','Superhost with 5+ years experience',NULL,1,'2025-12-19 12:07:06','2025-12-19 12:07:06'),
(3,'host2@gmail.com','$2a$10$EOwfclUokcAhTm0oLCKubeovdNo4Qn5Zbn5VfZ8zWSniogIDG6XoS','Jarvis Tan','+60177778888','/images/default-avatar.png','host','active','Offering premium stays in KL',NULL,1,'2025-12-19 12:07:06','2025-12-19 12:07:06'),
(4,'customer@gmail.com','$2a$10$EOwfclUokcAhTm0oLCKubeovdNo4Qn5Zbn5VfZ8zWSniogIDG6XoS','John Leong','+60123456789','/images/default-avatar.png','customer','active','Love traveling across Malaysia!',NULL,0,'2025-12-19 12:07:06','2025-12-19 12:07:06'),
(5,'customer2@gmail.com','$2a$10$EOwfclUokcAhTm0oLCKubeovdNo4Qn5Zbn5VfZ8zWSniogIDG6XoS','Lisa Lim','+60166667777','/images/default-avatar.png','customer','active','Frequent traveler',NULL,0,'2025-12-19 12:07:06','2025-12-19 12:07:06'),
(8,'host3@gmail.com','$2a$10$T.gS0/s8YUPZximrQ8jtgOSIltg.KJrtUozUt6icQVio2WSrq.Peu','Ryan Leong','+60123456393','/images/default-avatar.png','host','active',NULL,NULL,1,'2026-01-03 11:31:38','2026-01-04 07:30:41');

INSERT INTO listings (id, host_id, title, description, type, category, price, address, city, state, postal_code, latitude, longitude, max_guests, bedrooms, bathrooms, status, is_featured, view_count, created_at, updated_at) VALUES
(1,2,'Stunning KLCC View Apartment','Luxurious 2-bedroom apartment with panoramic views of the iconic Petronas Twin Towers. Modern furnishings, fully equipped kitchen, and resort-style amenities including infinity pool and gym.','accommodation','city',350.00,'Jalan Ampang','Kuala Lumpur','Kuala Lumpur',NULL,3.15790000,101.71160000,4,2,2,'active',1,165,'2025-12-19 20:07:06','2026-01-05 09:56:48'),
(2,2,'Beachfront Villa Langkawi','Wake up to the sound of waves in this exclusive beachfront villa. Private beach access, infinity pool, and traditional Malaysian architecture blended with modern luxury.','accommodation','beach',850.00,'Pantai Cenang','Langkawi','Kedah',NULL,6.30470000,99.72630000,8,4,3,'active',1,243,'2025-12-19 20:07:06','2025-12-19 20:07:06'),
(3,3,'Heritage Shophouse Georgetown','Beautifully restored pre-war shophouse in UNESCO World Heritage zone. Experience authentic Penang living with modern comforts. Walking distance to famous street food.','accommodation','city',280.00,'Lebuh Armenian','George Town','Penang',NULL,5.41410000,100.32880000,6,3,2,'active',1,192,'2025-12-19 20:07:06','2026-01-05 09:51:17'),
(4,3,'Cameron Highlands Tea Estate Bungalow','Charming colonial bungalow surrounded by rolling tea plantations. Cool mountain air, stunning sunrise views, and authentic English country atmosphere.','accommodation','nature',420.00,'Tanah Rata','Cameron Highlands','Pahang',NULL,4.47040000,101.37910000,6,3,2,'active',1,138,'2025-12-19 20:07:06','2026-01-04 07:37:38'),
(5,2,'Malacca River Boutique Stay','Contemporary boutique accommodation along the picturesque Malacca River. Minutes from Jonker Street, A Famosa, and the best chicken rice in town!','accommodation','city',180.00,'Jalan Tun Tan Cheng Lock','Malacca','Melaka',NULL,2.18960000,102.25010000,4,2,1,'active',0,98,'2025-12-19 20:07:06','2025-12-19 20:07:06'),
(6,3,'Kota Kinabalu Seaview Condo','Modern condo with breathtaking sunset views over the South China Sea. Perfect base for exploring Mount Kinabalu and the islands.','accommodation','beach',220.00,'Sutera Avenue','Kota Kinabalu','Sabah',NULL,5.95370000,116.05380000,4,2,2,'active',0,76,'2025-12-19 20:07:06','2025-12-19 20:07:06'),
(7,2,'Rainforest Treehouse Experience','Unique treehouse accommodation in the heart of Taman Negara. Immerse yourself in one of the world''s oldest rainforests while enjoying comfortable modern amenities.','accommodation','nature',320.00,'Kuala Tahan','Taman Negara','Pahang',NULL,4.38890000,102.41110000,2,1,1,'active',0,201,'2025-12-19 20:07:06','2026-01-04 07:31:30'),
(8,3,'Sunset Kayaking Tour','Paddle through mangroves and witness the magical sunset over Langkawi. Includes equipment, guide, and refreshments. Perfect for couples and families.','activity','beach',120.00,'Kilim Geopark','Langkawi','Kedah',NULL,6.42920000,99.85670000,8,0,0,'active',0,88,'2025-12-19 20:07:06','2026-01-04 07:31:06'),
(9,8,'Cold Song World Tour','Come Join My World Tour. Best Song of the Era','event','luxury',150.00,'Bukit Jalil Stadium','Kuala Lumpur','Kuala Lumpur',NULL,NULL,NULL,1,1,1,'active',0,4,'2026-01-03 11:33:19','2026-01-05 09:55:46');

INSERT INTO listing_amenities (listing_id, amenity_id) VALUES
(1,1),(1,2),(1,3),(1,5),(1,7),(1,8),(1,14),
(2,1),(2,2),(2,3),(2,5),(2,6),(2,7),(2,11),(2,12),
(3,1),(3,2),(3,3),(3,5),(3,14),
(4,1),(4,3),(4,5),(4,10),(4,13),
(5,1),(5,2),(5,3),(5,5),
(6,1),(6,2),(6,3),(6,5),(6,7),(6,8),
(7,1),(7,10),(7,16),(7,17);

INSERT INTO listing_images (id, listing_id, image_url, is_primary, display_order, created_at) VALUES
(11,1,'/uploads/images-1290292.jpg',1,0,'2026-01-03 11:30:47'),
(12,1,'/uploads/images-1502672260266-1c1ef2d93688.jpg',0,1,'2026-01-03 11:30:47'),
(13,2,'/uploads/images-1499793983690-e29da59ef1c2.jpg',1,0,'2026-01-03 11:30:47'),
(14,2,'/uploads/images-1506059612708-99d6c258160e.jpg',0,1,'2026-01-03 11:30:47'),
(15,3,'/uploads/images-1600596542815-ffad4c1539a9.jpg',1,0,'2026-01-03 11:30:47'),
(16,4,'/uploads/images-1610596542815-ffad4c1539a9.jpg',1,0,'2026-01-03 11:30:47'),
(17,5,'/uploads/images-1900490360182-c33d57733427.jpg',1,0,'2026-01-03 11:30:47'),
(18,6,'/uploads/images-1845324418-cc1a3fa10c00.jpg',1,0,'2026-01-03 11:30:47'),
(19,7,'/uploads/images-190.jpg',1,0,'2026-01-03 11:30:47'),
(20,8,'/uploads/images-1640596542815-ffad4c1539a9.jpg',1,0,'2026-01-03 11:30:47'),
(21,9,'/uploads/images-1767439999145-639681297.jpg',1,0,'2026-01-03 11:33:19');

INSERT INTO bookings (id, listing_id, customer_id, host_id, check_in, check_out, guests, total_price, service_fee, status, special_requests, cancelled_at, cancellation_reason, created_at, updated_at) VALUES
(1,1,1,2,'2025-12-27','2025-12-30',2,1155.00,105.00,'confirmed',NULL,NULL,NULL,'2025-12-19 20:07:06','2025-12-19 20:07:06'),
(2,2,4,2,'2026-01-03','2026-01-06',4,2805.00,255.00,'confirmed',NULL,NULL,NULL,'2025-12-19 20:07:06','2025-12-19 20:07:06'),
(3,3,1,3,'2025-11-20','2025-11-23',3,924.00,84.00,'completed',NULL,NULL,NULL,'2025-11-14 20:07:06','2025-12-19 20:07:06'),
(4,4,5,3,'2026-01-05','2026-01-06',1,462.00,42.00,'confirmed',NULL,NULL,NULL,'2026-01-04 07:37:51','2026-01-04 07:39:21'),
(5,1,4,2,'2026-01-07','2026-01-08',1,385.00,35.00,'completed',NULL,NULL,NULL,'2026-01-05 09:44:41','2026-01-05 09:50:03');

INSERT INTO favorites (id, user_id, listing_id, created_at) VALUES
(1,1,2,'2025-12-19 20:07:06'),
(2,1,4,'2025-12-19 20:07:06'),
(3,4,1,'2025-12-19 20:07:06'),
(4,4,7,'2025-12-19 20:07:06');

INSERT INTO reviews (id, booking_id, listing_id, customer_id, rating, comment, cleanliness_rating, communication_rating, location_rating, value_rating, is_reported, report_reason, status, created_at, updated_at) VALUES
(1,3,3,1,5,'Absolutely loved this place! The heritage shophouse was beautifully restored and the location was perfect for exploring Georgetown. Sarah was an amazing host - very responsive and helpful. The famous char kuey teow stall is literally 2 minutes walk. Will definitely come back!',5,5,5,5,0,NULL,'active','2025-11-24 20:07:06','2025-12-19 20:07:06'),
(2,5,1,4,5,'Great Experience and Spectacular View',5,5,5,5,1,'inappropriate','active','2026-01-05 09:50:03','2026-01-05 09:55:05');

INSERT INTO messages (id, sender_id, receiver_id, booking_id, subject, content, is_read, is_system_message, created_at) VALUES
(1,3,5,4,NULL,'Code for the door is 1234\r\n',0,0,'2026-01-04 07:40:11'),
(2,2,4,5,NULL,'Passcode is 1234 to the door',1,0,'2026-01-05 09:49:16'),
(3,4,2,NULL,NULL,'Alright',1,0,'2026-01-05 09:50:23');

INSERT INTO reports (id, reporter_id, reported_user_id, reported_listing_id, reported_review_id, type, reason, description, status, admin_notes, resolved_by, resolved_at, created_at) VALUES
(1,4,NULL,1,NULL,'listing','misleading',NULL,'pending',NULL,NULL,NULL,'2026-01-05 09:51:06'),
(2,2,NULL,NULL,2,'review','inappropriate','Reported by host','dismissed',NULL,1,'2026-01-05 09:56:33','2026-01-05 09:55:05');

INSERT INTO weather_data (id, city, date, condition_main, condition_description, icon, temp_current, temp_high, temp_low, humidity, wind_speed, is_admin_set, updated_at) VALUES
(6,'Cameron Highlands','2026-01-15','Clear',NULL,NULL,NULL,32.00,24.00,70,NULL,1,'2026-01-04 07:32:39'),
(7,'Kuala Lumpur','2026-01-14','Clouds',NULL,NULL,NULL,28.00,20.00,80,NULL,1,'2026-01-04 07:33:02'),
(8,'Johor Bahru','2026-01-16','Drizzle',NULL,NULL,NULL,26.00,20.00,80,NULL,1,'2026-01-04 07:35:20');

SET SQL_MODE = @OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS = @OLD_UNIQUE_CHECKS;
