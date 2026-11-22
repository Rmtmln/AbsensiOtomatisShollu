-- phpMyAdmin SQL Dump
-- version 5.2.2deb1+deb13u1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 01, 2026 at 12:21 PM
-- Server version: 11.8.3-MariaDB-0+deb13u1 from Debian
-- PHP Version: 8.4.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `shollu_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `absen_codes`
--

CREATE TABLE `absen_codes` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `code` varchar(100) NOT NULL,
  `label` varchar(255) DEFAULT '',
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `absen_codes`
--

INSERT INTO `absen_codes` (`id`, `account_id`, `code`, `label`, `is_active`) VALUES
(1, 1, '69907c2c98057', 'anjay', 1);

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `mesin_id` varchar(50) NOT NULL DEFAULT '1101932',
  `api_key` varchar(100) NOT NULL DEFAULT 'shollusemakindidepan',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `username`, `password`, `mesin_id`, `api_key`, `is_active`, `created_at`) VALUES
(1, '083173637677', 'c28116de8d739666954e6e1e3b608eaa:f0baca4c5efaf52360c20617ffd0b56c', '1101932', 'shollusemakindidepan', 1, '2026-02-28 12:14:05');

-- --------------------------------------------------------

--
-- Table structure for table `execution_tracker`
--

CREATE TABLE `execution_tracker` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `prayer` varchar(50) NOT NULL,
  `date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `execution_tracker`
--

INSERT INTO `execution_tracker` (`id`, `account_id`, `code`, `prayer`, `date`) VALUES
(12, 1, '232352535', 'ashar', '2026-03-01'),
(9, 1, '69907c2c98057', 'ashar', '2026-03-01'),
(13, 1, '69907c2c98057', 'maghrib', '2026-03-01'),
(8, 1, '69907c2c98057', 'manual', '2026-03-01');

-- --------------------------------------------------------

--
-- Table structure for table `logs`
--

CREATE TABLE `logs` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `prayer` varchar(50) NOT NULL,
  `code` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `response` text DEFAULT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `logs`
--

INSERT INTO `logs` (`id`, `account_id`, `prayer`, `code`, `status`, `response`, `timestamp`) VALUES
(84, 1, 'login', 'SYSTEM', 'success', 'Login berhasil (Bot)', '2026-03-01 16:10:02'),
(85, 1, 'ashar', '69907c2c98057', 'success', '[BERHASIL] QR Code found and attendance recorded', '2026-03-01 16:10:19'),
(86, 1, 'login-manual', 'SYSTEM', 'success', '[BERHASIL] Login manual untuk 083173637677', '2026-03-01 16:11:52'),
(87, 1, 'ashar', '69907c2c98057', 'success', '[BERHASIL] User sudah absen untuk sholat Ashar', '2026-03-01 16:12:02'),
(88, 1, 'login-manual', 'SYSTEM', 'success', '[BERHASIL] Login manual untuk 083173637677', '2026-03-01 16:15:29'),
(89, 1, 'ashar', '69907c2c98057', 'success', '[BERHASIL] User sudah absen untuk sholat Ashar', '2026-03-01 16:15:34'),
(90, 1, 'ashar', '232352535', 'success', '[BERHASIL] No matching QR code found', '2026-03-01 16:15:38'),
(91, 1, 'login-test', 'SYSTEM', 'success', '[BERHASIL] Verifikasi login untuk 083173637677', '2026-03-01 18:09:09'),
(92, 1, 'login', 'SYSTEM', 'success', 'Login berhasil (Bot)', '2026-03-01 18:53:33'),
(93, 1, 'maghrib', '69907c2c98057', 'success', '[BERHASIL] QR Code found and attendance recorded', '2026-03-01 18:53:56'),
(94, 1, 'login', 'SYSTEM', 'success', 'Login berhasil (Bot)', '2026-03-01 18:54:48');

-- --------------------------------------------------------

--
-- Table structure for table `schedules`
--

CREATE TABLE `schedules` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `prayer` enum('subuh','zuhur','ashar','maghrib','isya','tarawih') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schedules`
--

INSERT INTO `schedules` (`id`, `account_id`, `prayer`, `is_active`) VALUES
(1, 1, 'subuh', 1),
(2, 1, 'zuhur', 1),
(3, 1, 'ashar', 1),
(4, 1, 'maghrib', 1),
(5, 1, 'isya', 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `is_approved` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `is_approved`, `created_at`) VALUES
(1, 'rahmets', '$2b$10$ssq5aDHKp95sxAkUDm230uK1osj8XcPEx4P9PLVmnWMZGDrOmx/VK', 1, '2026-02-28 09:10:40'),
(3, 'tester', '$2b$10$V8w6Ujp.zLLKXjYM6d64.eoc9dxD6U/MZvk81C7EJXbE0EJY86q1W', 1, '2026-02-28 23:46:56');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `absen_codes`
--
ALTER TABLE `absen_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_account_codes` (`account_id`);

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `execution_tracker`
--
ALTER TABLE `execution_tracker`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_execution` (`account_id`,`code`,`prayer`,`date`);

--
-- Indexes for table `logs`
--
ALTER TABLE `logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_account_logs` (`account_id`);

--
-- Indexes for table `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_account_prayer` (`account_id`,`prayer`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `absen_codes`
--
ALTER TABLE `absen_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `execution_tracker`
--
ALTER TABLE `execution_tracker`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `logs`
--
ALTER TABLE `logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT for table `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `absen_codes`
--
ALTER TABLE `absen_codes`
  ADD CONSTRAINT `fk_account_codes` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `execution_tracker`
--
ALTER TABLE `execution_tracker`
  ADD CONSTRAINT `fk_account_tracker` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `logs`
--
ALTER TABLE `logs`
  ADD CONSTRAINT `fk_account_logs` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `fk_account_schedules` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
