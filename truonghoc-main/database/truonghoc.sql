-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 16, 2026 at 01:41 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `truonghoc`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_capnhat_trangthai_mon_hoc` (IN `p_SinhVienID` INT, IN `p_MonHocID` INT, IN `p_HocKyID` INT, IN `p_DiemTongKet` DECIMAL(4,2), IN `p_UserID` INT)   BEGIN
    DECLARE v_TrangThai ENUM('DaHoanThanh','Rot','HocLai','Mien') DEFAULT 'Rot';
    
    IF p_DiemTongKet >= 5.0 THEN
        SET v_TrangThai = 'DaHoanThanh';
    ELSEIF p_DiemTongKet >= 4.0 THEN
        SET v_TrangThai = 'HocLai';
    END IF;
    
    INSERT INTO trangthai_monhoc_sinhvien (
        SinhVienID, MonHocID, HocKyHoanThanh, TrangThai, DiemTongKet, LanThi
    )
    VALUES (p_SinhVienID, p_MonHocID, p_HocKyID, v_TrangThai, p_DiemTongKet, 1)
    ON DUPLICATE KEY UPDATE
        HocKyHoanThanh = p_HocKyID,
        TrangThai = v_TrangThai,
        DiemTongKet = p_DiemTongKet,
        LanThi = LanThi + 1;
    
    INSERT INTO hethong_log (UserID, HanhDong, MoTa, BangLienQuan, IDBanGhi)
    VALUES (p_UserID, 'CapNhatTrangThaiMon', CONCAT('Cập nhật trạng thái môn ', p_MonHocID, ' cho SV ', p_SinhVienID), 'trangthai_monhoc_sinhvien', p_SinhVienID, CURRENT_TIMESTAMP);
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_dangky_hocphan` (IN `p_SinhVienID` INT, IN `p_LopHocPhanID` INT, IN `p_UserID` INT, OUT `p_KetQua` VARCHAR(255), OUT `p_ThanhCong` TINYINT)   BEGIN
    DECLARE v_DaDangKy INT DEFAULT 0;
    DECLARE v_SiSoHienTai INT DEFAULT 0;
    DECLARE v_SiSoToiDa INT DEFAULT 0;
    DECLARE v_MonHocID INT;
    DECLARE v_HocKyID INT;
    DECLARE v_DotDangKyID INT;
    DECLARE v_TrangThaiDot ENUM('Mo','Dong','TamNgung');
    DECLARE v_NgayBatDau DATETIME;
    DECLARE v_NgayKetThuc DATETIME;
    DECLARE v_CoNoHocPhi DECIMAL(15,2) DEFAULT 0;
    DECLARE v_MonTienQuyet INT DEFAULT 0;
    DECLARE v_MonSongHanh INT DEFAULT 0;
    DECLARE v_TrungLichHoc INT DEFAULT 0;
    DECLARE v_TrungLichThi INT DEFAULT 0;
    
    -- 1. Kiểm tra lớp học phần có tồn tại
    IF NOT EXISTS (SELECT 1 FROM lophocphan WHERE LopHocPhanID = p_LopHocPhanID) THEN
        SET p_KetQua = 'Lớp học phần không tồn tại';
        SET p_ThanhCong = 0;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_KetQua;
    END IF;
    
    SELECT MonHocID, HocKyID, SoLuongToiDa INTO v_MonHocID, v_HocKyID, v_SiSoToiDa
    FROM lophocphan WHERE LopHocPhanID = p_LopHocPhanID;
    
    -- 2. Kiểm tra đã đăng ký môn này chưa (tránh trùng môn trong cùng học kỳ)
    SELECT COUNT(*) INTO v_DaDangKy
    FROM dangkyhocphan dk
    INNER JOIN lophocphan lh ON dk.LopHocPhanID = lh.LopHocPhanID
    WHERE dk.SinhVienID = p_SinhVienID
      AND lh.MonHocID = v_MonHocID
      AND lh.HocKyID = v_HocKyID
      AND dk.TrangThai = 'ThanhCong';
    
    IF v_DaDangKy > 0 THEN
        SET p_KetQua = 'Bạn đã đăng ký môn học này trong học kỳ này';
        SET p_ThanhCong = 0;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_KetQua;
    END IF;
    
    -- 3. Kiểm tra sĩ số lớp
    SELECT COUNT(*) INTO v_SiSoHienTai
    FROM dangkyhocphan
    WHERE LopHocPhanID = p_LopHocPhanID AND TrangThai = 'ThanhCong';
    
    IF v_SiSoHienTai >= v_SiSoToiDa THEN
        SET p_KetQua = 'Lớp học phần đã đủ sĩ số';
        SET p_ThanhCong = 0;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_KetQua;
    END IF;
    
    -- 4. Kiểm tra đợt đăng ký đang mở
    SELECT DotDangKyID, TrangThai, NgayBatDau, NgayKetThuc INTO v_DotDangKyID, v_TrangThaiDot, v_NgayBatDau, v_NgayKetThuc
    FROM dot_dangky
    WHERE HocKyID = v_HocKyID
      AND TrangThai = 'Mo'
      AND CURRENT_TIMESTAMP BETWEEN NgayBatDau AND NgayKetThuc
    LIMIT 1;
    
    IF v_DotDangKyID IS NULL THEN
        SET p_KetQua = 'Hiện không có đợt đăng ký nào đang mở cho học kỳ này';
        SET p_ThanhCong = 0;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_KetQua;
    END IF;
    
    -- 5. Kiểm tra công nợ học phí (nếu có quy định chặn)
    SELECT (TongTien - DaNop) INTO v_CoNoHocPhi
    FROM hocphi
    WHERE SinhVienID = p_SinhVienID AND HocKyID = v_HocKyID
    LIMIT 1;
    
    IF v_CoNoHocPhi > 0 THEN   -- có thể điều chỉnh ngưỡng
        SET p_KetQua = 'Bạn còn nợ học phí, vui lòng thanh toán trước khi đăng ký';
        SET p_ThanhCong = 0;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_KetQua;
    END IF;
    
    -- 6. Kiểm tra môn tiên quyết (đã hoàn thành chưa)
    SELECT COUNT(*) INTO v_MonTienQuyet
    FROM dieukienmonhoc dtq
    LEFT JOIN trangthai_monhoc_sinhvien tmhs 
      ON dtq.MonTienQuyetID = tmhs.MonHocID 
      AND tmhs.SinhVienID = p_SinhVienID
      AND tmhs.TrangThai = 'DaHoanThanh'
    WHERE dtq.MonHocID = v_MonHocID
      AND tmhs.ID IS NULL;
    
    IF v_MonTienQuyet > 0 THEN
        SET p_KetQua = 'Bạn chưa hoàn thành môn tiên quyết';
        SET p_ThanhCong = 0;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_KetQua;
    END IF;
    
    -- 7. Kiểm tra môn song hành (nếu có quy định bắt buộc phải học cùng kỳ)
    -- (có thể bỏ qua nếu trường không yêu cầu nghiêm ngặt)
    
    -- 8. Kiểm tra trùng lịch học (so sánh tiết học)
    -- (cần logic phức tạp hơn, ví dụ join lich_hoc → so sánh ngày, buổi, tiết)
    -- tạm thời để comment, nếu cần triển khai chi tiết thì mở rộng sau
    
    -- Nếu qua hết kiểm tra → thực hiện đăng ký
    INSERT INTO dangkyhocphan (SinhVienID, LopHocPhanID, ThoiGianDangKy, TrangThai)
    VALUES (p_SinhVienID, p_LopHocPhanID, CURRENT_TIMESTAMP, 'ThanhCong');
    
    -- Ghi log
    INSERT INTO hethong_log (UserID, HanhDong, MoTa, BangLienQuan, IDBanGhi, created_at)
    VALUES (p_UserID, 'DangKyHocPhan', CONCAT('SV ', p_SinhVienID, ' đăng ký lớp HP ', p_LopHocPhanID), 'dangkyhocphan', LAST_INSERT_ID(), CURRENT_TIMESTAMP);
    
    SET p_KetQua = 'Đăng ký học phần thành công';
    SET p_ThanhCong = 1;
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_dong_dot_dangky` (IN `p_DotDangKyID` INT, IN `p_UserID` INT, OUT `p_KetQua` VARCHAR(255))   BEGIN
    UPDATE dot_dangky
    SET TrangThai = 'Dong',
        updated_at = CURRENT_TIMESTAMP
    WHERE DotDangKyID = p_DotDangKyID;
    
    IF ROW_COUNT() = 0 THEN
        SET p_KetQua = 'Không tìm thấy đợt đăng ký';
    ELSE
        SET p_KetQua = 'Đóng đợt đăng ký thành công';
        
        INSERT INTO hethong_log (UserID, HanhDong, MoTa, BangLienQuan, IDBanGhi)
        VALUES (p_UserID, 'DongDotDangKy', CONCAT('Đóng đợt ID ', p_DotDangKyID), 'dot_dangky', p_DotDangKyID, CURRENT_TIMESTAMP);
    END IF;
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_huy_dangky_hocphan` (IN `p_DangKyID` INT, IN `p_UserID` INT, OUT `p_KetQua` VARCHAR(255), OUT `p_ThanhCong` TINYINT)   BEGIN
    DECLARE v_SinhVienID INT;
    DECLARE v_LopHocPhanID INT;
    
    SELECT SinhVienID, LopHocPhanID INTO v_SinhVienID, v_LopHocPhanID
    FROM dangkyhocphan
    WHERE DangKyID = p_DangKyID AND TrangThai = 'ThanhCong';
    
    IF v_SinhVienID IS NULL THEN
        SET p_KetQua = 'Không tìm thấy đăng ký hợp lệ hoặc đã hủy';
        SET p_ThanhCong = 0;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_KetQua;
    END IF;
    
    -- Kiểm tra thời gian hủy (ví dụ: chỉ cho hủy trong 7 ngày đầu đợt)
    -- Có thể thêm điều kiện ở đây
    
    UPDATE dangkyhocphan 
    SET TrangThai = 'Huy',
        ThoiGianDangKy = CURRENT_TIMESTAMP   -- có thể thêm trường ThoiGianHuy riêng
    WHERE DangKyID = p_DangKyID;
    
    INSERT INTO hethong_log (UserID, HanhDong, MoTa, BangLienQuan, IDBanGhi)
    VALUES (p_UserID, 'HuyHocPhan', CONCAT('Hủy đăng ký ID ', p_DangKyID), 'dangkyhocphan', p_DangKyID, CURRENT_TIMESTAMP);
    
    SET p_KetQua = 'Hủy đăng ký thành công';
    SET p_ThanhCong = 1;
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_mo_dot_dangky` (IN `p_HocKyID` INT, IN `p_TenDot` VARCHAR(100), IN `p_NgayBatDau` DATETIME, IN `p_NgayKetThuc` DATETIME, IN `p_DoiTuong` VARCHAR(255), IN `p_GhiChu` TEXT, IN `p_UserID` INT, OUT `p_DotDangKyID` INT)   BEGIN
    INSERT INTO dot_dangky (
        HocKyID, TenDot, NgayBatDau, NgayKetThuc, TrangThai, DoiTuong, GhiChu
    )
    VALUES (
        p_HocKyID, p_TenDot, p_NgayBatDau, p_NgayKetThuc, 'Mo', p_DoiTuong, p_GhiChu
    );
    
    SET p_DotDangKyID = LAST_INSERT_ID();
    
    INSERT INTO hethong_log (UserID, HanhDong, MoTa, BangLienQuan, IDBanGhi)
    VALUES (p_UserID, 'MoDotDangKy', CONCAT('Mở đợt đăng ký: ', p_TenDot), 'dot_dangky', p_DotDangKyID, CURRENT_TIMESTAMP);
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_nhap_diem_tong_hop` (IN `p_DangKyID` INT, IN `p_DiemChuyenCan` FLOAT, IN `p_DiemGiuaKy` FLOAT, IN `p_DiemThi` FLOAT, IN `p_UserID` INT, OUT `p_KetQua` VARCHAR(255))   BEGIN
    -- Kiểm tra bản ghi diemso đã tồn tại chưa
    IF NOT EXISTS (SELECT 1 FROM diemso WHERE DangKyID = p_DangKyID) THEN
        INSERT INTO diemso (DangKyID) VALUES (p_DangKyID);
    END IF;

    -- Cập nhật điểm: Dùng COALESCE để nếu tham số truyền vào là NULL thì giữ nguyên giá trị cũ
    UPDATE diemso
    SET 
        DiemChuyenCan = COALESCE(p_DiemChuyenCan, DiemChuyenCan),
        DiemGiuaKy    = COALESCE(p_DiemGiuaKy, DiemGiuaKy),
        DiemThi       = COALESCE(p_DiemThi, DiemThi)
    WHERE DangKyID = p_DangKyID;

    -- Ghi Log (Lựa chọn B: Đã bỏ CURRENT_TIMESTAMP dư thừa)
    INSERT INTO hethong_log (UserID, HanhDong, MoTa, BangLienQuan, IDBanGhi)
    VALUES (
        p_UserID, 
        'NhapDiem', 
        CONCAT('Cập nhật điểm cho bản ghi đăng ký ID: ', p_DangKyID), 
        'diemso', 
        p_DangKyID
    );

    SET p_KetQua = 'Cập nhật điểm thành công';
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_tinh_diem_tong_ket` (IN `p_DangKyID` INT, IN `p_UserID` INT)   BEGIN
    DECLARE v_DiemTongKet DECIMAL(4,2);
    
    SELECT 
        ROUND(
            (COALESCE(DiemChuyenCan, 0) * 0.2) +
            (COALESCE(DiemGiuaKy, 0) * 0.3) +
            (COALESCE(DiemThi, 0) * 0.5),
            2
        ) INTO v_DiemTongKet
    FROM diemso
    WHERE DangKyID = p_DangKyID;
    
    UPDATE diemso
    SET DiemTongKet = v_DiemTongKet
    WHERE DangKyID = p_DangKyID;
    
    -- Ghi log
    INSERT INTO hethong_log (UserID, HanhDong, MoTa, BangLienQuan, IDBanGhi)
    VALUES (p_UserID, 'TinhDiemTongKet', CONCAT('Tính điểm tổng kết cho đăng ký ', p_DangKyID), 'diemso', p_DangKyID, CURRENT_TIMESTAMP);
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_tinh_gpa_hoc_ky` (IN `p_SinhVienID` INT, IN `p_HocKyID` INT, OUT `p_GPA` DECIMAL(4,2), OUT `p_TongTinChi` INT)   BEGIN
    SELECT 
        ROUND(
            SUM(CASE 
                WHEN ds.DiemTongKet >= 8.0 THEN 4.0
                WHEN ds.DiemTongKet >= 7.0 THEN 3.5
                WHEN ds.DiemTongKet >= 6.0 THEN 3.0
                WHEN ds.DiemTongKet >= 5.0 THEN 2.0
                ELSE 0
            END * mh.SoTinChi) / SUM(mh.SoTinChi),
            2
        ),
        SUM(mh.SoTinChi)
    INTO p_GPA, p_TongTinChi
    FROM dangkyhocphan dk
    INNER JOIN lophocphan lh ON dk.LopHocPhanID = lh.LopHocPhanID
    INNER JOIN monhoc mh ON lh.MonHocID = mh.MonHocID
    LEFT JOIN diemso ds ON dk.DangKyID = ds.DangKyID
    WHERE dk.SinhVienID = p_SinhVienID
      AND lh.HocKyID = p_HocKyID
      AND dk.TrangThai = 'ThanhCong'
      AND ds.DiemTongKet IS NOT NULL;
      
    IF p_TongTinChi IS NULL THEN
        SET p_GPA = 0.00;
        SET p_TongTinChi = 0;
    END IF;
    
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `AdminID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `HoTen` varchar(100) NOT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `SoDienThoai` varchar(15) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`AdminID`, `UserID`, `HoTen`, `Email`, `SoDienThoai`, `created_at`) VALUES
(3, 1, 'Nguyễn Văn Quản Trị', NULL, NULL, '2026-02-24 08:30:01');

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cache`
--

INSERT INTO `cache` (`key`, `value`, `expiration`) VALUES
('laravel-cache-3425UdiZZJi4yfJq', 's:7:\"forever\";', 2088977835),
('laravel-cache-illuminate:queue:restart', 'i:1772849959;', 2088209959),
('laravel-cache-OF2kvhmNo6GHHLz8', 's:7:\"forever\";', 2088977998);

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chitietdiemrenluyen`
--

CREATE TABLE `chitietdiemrenluyen` (
  `ID` int(11) NOT NULL,
  `DiemRenLuyenID` int(11) NOT NULL,
  `TieuChiID` int(11) NOT NULL,
  `DiemDatDuoc` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chitietdiemrenluyen`
--

INSERT INTO `chitietdiemrenluyen` (`ID`, `DiemRenLuyenID`, `TieuChiID`, `DiemDatDuoc`) VALUES
(11, 1, 1, 18),
(12, 1, 2, 19),
(13, 1, 3, 23),
(14, 1, 4, 18),
(15, 1, 5, 14);

-- --------------------------------------------------------

--
-- Table structure for table `chuongtrinhdaotao`
--

CREATE TABLE `chuongtrinhdaotao` (
  `ID` int(11) NOT NULL,
  `NganhID` int(11) NOT NULL,
  `MonHocID` int(11) NOT NULL,
  `HocKyGoiY` int(11) DEFAULT NULL,
  `BatBuoc` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chuongtrinhdaotao`
--

INSERT INTO `chuongtrinhdaotao` (`ID`, `NganhID`, `MonHocID`, `HocKyGoiY`, `BatBuoc`) VALUES
(1, 1, 1, 4, 0),
(2, 1, 2, 1, 1),
(6, 1, 6, 3, 1),
(7, 2, 1, 1, 1),
(8, 2, 2, 1, 1),
(9, 2, 3, 2, 1),
(10, 2, 6, 2, 1),
(11, 3, 7, 1, 1),
(12, 3, 8, 1, 1),
(13, 3, 9, 2, 1),
(14, 3, 10, 2, 1),
(15, 4, 7, 1, 1),
(16, 4, 11, 1, 1),
(17, 4, 12, 2, 1),
(18, 1, 5, 3, 1),
(19, 1, 3, 2, 1),
(20, 1, 4, 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `dangkyhocphan`
--

CREATE TABLE `dangkyhocphan` (
  `DangKyID` int(11) NOT NULL,
  `SinhVienID` int(11) DEFAULT NULL,
  `LopHocPhanID` int(11) DEFAULT NULL,
  `ThoiGianDangKy` datetime DEFAULT current_timestamp(),
  `TrangThai` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dangkyhocphan`
--

INSERT INTO `dangkyhocphan` (`DangKyID`, `SinhVienID`, `LopHocPhanID`, `ThoiGianDangKy`, `TrangThai`) VALUES
(1, 1, 1, '2026-02-24 10:34:29', 'DaDangKy'),
(2, 1, 2, '2026-02-24 10:34:29', 'DaDangKy'),
(3, 2, 1, '2026-02-24 10:34:29', 'DaDangKy'),
(4, 2, 2, '2026-02-24 10:34:29', 'DaDangKy'),
(5, 3, 1, '2026-02-24 10:34:29', 'DaDangKy'),
(6, 4, 3, '2026-02-24 10:34:29', 'DaDangKy'),
(7, 4, 4, '2026-02-24 10:34:29', 'DaDangKy'),
(8, 5, 3, '2026-02-24 10:34:29', 'DaDangKy'),
(9, 6, 3, '2026-02-24 10:34:29', 'DaDangKy'),
(53, 1, 11, '2026-03-13 03:31:45', 'DaDangKy');

--
-- Triggers `dangkyhocphan`
--
DELIMITER $$
CREATE TRIGGER `trg_after_insert_dangkyhocphan` AFTER INSERT ON `dangkyhocphan` FOR EACH ROW BEGIN
    IF NEW.TrangThai = 'ThanhCong' THEN
        INSERT INTO hethong_log (
            UserID, 
            HanhDong, 
            MoTa, 
            BangLienQuan, 
            IDBanGhi, 
            created_at
        )
        VALUES (
            NULL,  -- lấy từ session backend
            'DangKyHocPhanMoi',
            CONCAT('Đăng ký học phần thành công - SV: ', NEW.SinhVienID, ' - Lớp HP: ', NEW.LopHocPhanID),
            'dangkyhocphan',
            NEW.DangKyID,
            CURRENT_TIMESTAMP
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_after_update_dangkyhocphan_huy` AFTER UPDATE ON `dangkyhocphan` FOR EACH ROW BEGIN
    IF NEW.TrangThai = 'Huy' AND OLD.TrangThai = 'ThanhCong' THEN
        INSERT INTO hethong_log (
            UserID, 
            HanhDong, 
            MoTa, 
            BangLienQuan, 
            IDBanGhi, 
            created_at
        )
        VALUES (
            NULL,  -- nếu không biết user nào hủy, để NULL hoặc lấy từ session ở backend
            'HuyDangKyHocPhan',
            CONCAT('Hủy đăng ký học phần ID: ', OLD.DangKyID, ' - Sinh viên: ', OLD.SinhVienID),
            'dangkyhocphan',
            OLD.DangKyID,
            CURRENT_TIMESTAMP
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `diemrenluyen`
--

CREATE TABLE `diemrenluyen` (
  `DiemRenLuyenID` int(11) NOT NULL,
  `SinhVienID` int(11) NOT NULL,
  `HocKyID` int(11) NOT NULL,
  `TongDiem` int(11) DEFAULT NULL,
  `XepLoai` varchar(50) DEFAULT NULL,
  `NgayDanhGia` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `diemrenluyen`
--

INSERT INTO `diemrenluyen` (`DiemRenLuyenID`, `SinhVienID`, `HocKyID`, `TongDiem`, `XepLoai`, `NgayDanhGia`) VALUES
(1, 1, 1, 85, 'Tốt', '2026-03-15'),
(2, 2, 1, 72, 'Khá', '2026-03-15'),
(3, 3, 1, 78, 'Kha', '2025-01-10'),
(4, 4, 1, 88, 'Tot', '2025-01-10'),
(5, 5, 1, 70, 'Kha', '2025-01-10'),
(6, 6, 1, 60, 'TrungBinh', '2025-01-10');

-- --------------------------------------------------------

--
-- Table structure for table `diemso`
--

CREATE TABLE `diemso` (
  `DiemID` int(11) NOT NULL,
  `DangKyID` int(11) DEFAULT NULL,
  `DiemChuyenCan` decimal(4,2) DEFAULT NULL,
  `DiemGiuaKy` decimal(4,2) DEFAULT NULL,
  `DiemThi` decimal(4,2) DEFAULT NULL,
  `DiemTongKet` decimal(4,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `diemso`
--

INSERT INTO `diemso` (`DiemID`, `DangKyID`, `DiemChuyenCan`, `DiemGiuaKy`, `DiemThi`, `DiemTongKet`) VALUES
(2, 1, 10.00, 8.50, 7.00, 8.05),
(4, 2, 9.00, 7.00, 6.50, 7.15);

-- --------------------------------------------------------

--
-- Table structure for table `dieukienmonhoc`
--

CREATE TABLE `dieukienmonhoc` (
  `DieuKienID` int(11) NOT NULL,
  `MonHocID` int(11) NOT NULL,
  `MonTienQuyetID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dieukienmonhoc`
--

INSERT INTO `dieukienmonhoc` (`DieuKienID`, `MonHocID`, `MonTienQuyetID`) VALUES
(1, 3, 1),
(2, 4, 3),
(3, 5, 2),
(4, 2, 1),
(5, 12, 11),
(6, 10, 1),
(7, 15, 16);

-- --------------------------------------------------------

--
-- Table structure for table `dotdangky`
--

CREATE TABLE `dotdangky` (
  `DotDangKyID` int(11) NOT NULL,
  `HocKyID` int(11) NOT NULL,
  `TenDot` varchar(100) NOT NULL,
  `NgayBatDau` datetime NOT NULL,
  `NgayKetThuc` datetime NOT NULL,
  `TrangThai` tinyint(4) DEFAULT 1,
  `DoiTuong` varchar(255) DEFAULT NULL,
  `GhiChu` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dotdangky`
--

INSERT INTO `dotdangky` (`DotDangKyID`, `HocKyID`, `TenDot`, `NgayBatDau`, `NgayKetThuc`, `TrangThai`, `DoiTuong`, `GhiChu`, `created_at`, `updated_at`) VALUES
(11, 11, 'Đợt đăng ký học kỳ 1 - Lần 2', '2024-07-01 07:30:00', '2028-07-12 17:00:00', 1, NULL, NULL, '2026-03-04 09:12:29', '2026-03-13 10:02:41'),
(12, 11, 'Đợt đăng ký Học kỳ 1', '2026-03-15 08:00:00', '2026-03-30 23:59:59', 1, NULL, NULL, '2026-03-12 23:55:08', '2026-03-12 23:55:08'),
(13, 11, 'Đợt đăng ký Học kỳ 1', '2024-06-01 08:00:00', '2024-06-15 23:59:59', 0, NULL, NULL, '2026-03-13 00:02:28', '2026-03-13 00:02:28');

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `failed_jobs`
--

INSERT INTO `failed_jobs` (`id`, `uuid`, `connection`, `queue`, `payload`, `exception`, `failed_at`) VALUES
(1, '0458ebab-a265-446f-80a0-9ed550705bd5', 'redis', 'registration', '{\"uuid\":\"0458ebab-a265-446f-80a0-9ed550705bd5\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":null,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":null,\"timeout\":null,\"retryUntil\":null,\"data\":{\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":2:{s:7:\\\"\\u0000*\\u0000svID\\\";i:1;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"batchId\":null},\"createdAt\":1772846767,\"id\":\"t6b0xV0j3qoCVR0R2ScftczuFSzYJaVg\",\"attempts\":0,\"delay\":null}', 'Illuminate\\Database\\Eloquent\\ModelNotFoundException: No query results for model [App\\Models\\LopHocPhan]. in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php:630\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(49): Illuminate\\Database\\Eloquent\\Builder->findOrFail(NULL)\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#4 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#38 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#39 {main}', '2026-03-06 18:39:15'),
(2, '3e4dc102-8d88-41c4-b7d1-d345c4bf1c51', 'redis', 'registration', '{\"uuid\":\"3e4dc102-8d88-41c4-b7d1-d345c4bf1c51\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":\"10,30\",\"timeout\":60,\"retryUntil\":null,\"data\":{\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"batchId\":null},\"createdAt\":1772847173,\"id\":\"wvTQkHBZU3iN2sw59kMYgpnXA8p7QJqq\",\"attempts\":0,\"delay\":null}', 'PDOException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\QueryException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `TrangThai`) values (1, 11, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 18:39:17'),
(3, 'ff38c88d-417f-477f-93ad-e5007955543a', 'redis', 'registration', '{\"uuid\":\"ff38c88d-417f-477f-93ad-e5007955543a\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":\"10,30\",\"timeout\":60,\"retryUntil\":null,\"data\":{\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"batchId\":null},\"createdAt\":1772847565,\"id\":\"uSjnIVmJr8vgo4VnSjHOicCwr2BcZB2L\",\"attempts\":0,\"delay\":null}', 'PDOException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\QueryException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `TrangThai`) values (1, 11, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 18:39:26'),
(4, '156a7d62-1bc4-411f-b0be-85251476c2ac', 'redis', 'registration', '{\"uuid\":\"156a7d62-1bc4-411f-b0be-85251476c2ac\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":\"10,30\",\"timeout\":60,\"retryUntil\":null,\"data\":{\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"batchId\":null},\"createdAt\":1772847692,\"id\":\"lOAXO4zOooUhSIgub3m5YP2sxOgtgQi9\",\"attempts\":0,\"delay\":null}', 'PDOException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\QueryException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `TrangThai`) values (1, 11, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 18:41:34'),
(5, '9775f144-0315-4121-91ba-22713e398cf9', 'redis', 'registration', '{\"uuid\":\"9775f144-0315-4121-91ba-22713e398cf9\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":\"10,30\",\"timeout\":60,\"retryUntil\":null,\"data\":{\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"batchId\":null},\"createdAt\":1772848258,\"id\":\"qKiRMty0TZT8J2VJ2BM9XPP7Qwz4Tny0\",\"attempts\":0,\"delay\":null}', 'PDOException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\QueryException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `TrangThai`) values (1, 11, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 18:51:00'),
(6, 'd8fad866-3def-41db-831b-b76900c1e460', 'redis', 'registration', '{\"uuid\":\"d8fad866-3def-41db-831b-b76900c1e460\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":\"10,30\",\"timeout\":60,\"retryUntil\":null,\"data\":{\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"batchId\":null},\"createdAt\":1772848371,\"id\":\"Bqfg9GgKAzRcE7eG1mvy52OXemT6JQlU\",\"attempts\":0,\"delay\":null}', 'PDOException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\QueryException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `TrangThai`) values (1, 11, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 18:52:52'),
(7, 'dc3ff8ee-9e36-4c1e-b406-c09a2614374f', 'redis', 'registration', '{\"uuid\":\"dc3ff8ee-9e36-4c1e-b406-c09a2614374f\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":\"10,30\",\"timeout\":60,\"retryUntil\":null,\"data\":{\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"batchId\":null},\"createdAt\":1772848589,\"id\":\"gf0svBWhb2ntMxNNJDGC6K6jpxl3lgul\",\"attempts\":0,\"delay\":null}', 'PDOException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\QueryException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `TrangThai`) values (1, 11, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 18:56:30'),
(8, '90055802-4932-4f27-a490-e33a9e185695', 'redis', 'registration', '{\"uuid\":\"90055802-4932-4f27-a490-e33a9e185695\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":\"10,30\",\"timeout\":60,\"retryUntil\":null,\"data\":{\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"batchId\":null},\"createdAt\":1772848741,\"id\":\"7Dtiyf2UUbzVcUajvXR003V4rkW6djYh\",\"attempts\":0,\"delay\":null}', 'PDOException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\QueryException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `TrangThai`) values (1, 11, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(73): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(47): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 18:59:04'),
(9, '36b49470-307a-4e34-b110-44bb2891a03c', 'redis', 'registration', '{\"uuid\":\"36b49470-307a-4e34-b110-44bb2891a03c\",\"timeout\":60,\"id\":\"NTLgA8mSAtNRAjuZBOfVkIDzZDGOBU4W\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"backoff\":\"10,30\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"createdAt\":1772848769,\"failOnTimeout\":false,\"maxExceptions\":null,\"retryUntil\":null,\"data\":{\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"batchId\":null},\"delay\":null,\"attempts\":2}', 'PDOException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(67): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(45): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration,de...\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration,de...\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\QueryException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `ThoiGianDangKy`, `TrangThai`) values (1, 11, 2026-03-07 02:00:10, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(67): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(45): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration,de...\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration,de...\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 19:00:10'),
(10, 'ed301eea-2ba8-4115-a3a7-70725162db56', 'redis', 'registration', '{\"uuid\":\"ed301eea-2ba8-4115-a3a7-70725162db56\",\"timeout\":60,\"id\":\"ZLbyUMkrcgqrEdpKZKmzLJEJT3tEYx9D\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"backoff\":\"10,30\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"createdAt\":1772848935,\"failOnTimeout\":false,\"maxExceptions\":null,\"retryUntil\":null,\"data\":{\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"batchId\":null},\"delay\":null,\"attempts\":2}', 'PDOException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(67): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(45): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration,de...\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration,de...\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\QueryException: SQLSTATE[01000]: Warning: 1265 Data truncated for column \'TrangThai\' at row 1 (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `ThoiGianDangKy`, `TrangThai`) values (1, 11, 2026-03-07 02:03:00, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(67): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(45): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration,de...\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration,de...\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 19:03:01'),
(11, '4ab50300-e58f-4646-9372-ffcbb3674f36', 'redis', 'registration', '{\"uuid\":\"4ab50300-e58f-4646-9372-ffcbb3674f36\",\"timeout\":60,\"id\":\"bSWXxStcQ7Aep1Gx9Q2w8Gm5bLro4Tjn\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"backoff\":\"10,30\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"createdAt\":1772849066,\"failOnTimeout\":false,\"maxExceptions\":null,\"retryUntil\":null,\"data\":{\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"batchId\":null},\"delay\":null,\"attempts\":2}', 'PDOException: SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry \'1-11\' for key \'SinhVienID\' in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(67): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(45): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration,de...\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration,de...\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\UniqueConstraintViolationException: SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry \'1-11\' for key \'SinhVienID\' (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `ThoiGianDangKy`, `TrangThai`) values (1, 11, 2026-03-07 02:05:13, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(67): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(45): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration,de...\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration,de...\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 19:05:13'),
(12, '535a9b2c-14f2-4301-8d77-7c2e8d6ea3c1', 'redis', 'registration', '{\"uuid\":\"535a9b2c-14f2-4301-8d77-7c2e8d6ea3c1\",\"timeout\":60,\"id\":\"7AgnziP4lPj9hLgPF4Ja1CakA3NHRabu\",\"displayName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"backoff\":\"10,30\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":3,\"createdAt\":1772849152,\"failOnTimeout\":false,\"maxExceptions\":null,\"retryUntil\":null,\"data\":{\"command\":\"O:29:\\\"App\\\\Jobs\\\\ProcessDangKyHocPhan\\\":3:{s:10:\\\"sinhVienID\\\";i:1;s:12:\\\"lopHocPhanID\\\";i:11;s:5:\\\"queue\\\";s:12:\\\"registration\\\";}\",\"commandName\":\"App\\\\Jobs\\\\ProcessDangKyHocPhan\",\"batchId\":null},\"delay\":null,\"attempts\":2}', 'PDOException: SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry \'1-11\' for key \'SinhVienID\' in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php:53\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(53): PDOStatement->execute()\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(827): Illuminate\\Database\\MySqlConnection->Illuminate\\Database\\{closure}(\'insert into `da...\', Array)\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#14 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#16 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(67): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#18 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#20 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(45): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration,de...\', Object(Illuminate\\Queue\\WorkerOptions))\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration,de...\')\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#45 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#53 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#54 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#55 {main}\n\nNext Illuminate\\Database\\UniqueConstraintViolationException: SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry \'1-11\' for key \'SinhVienID\' (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: TruongHoc, SQL: insert into `dangkyhocphan` (`SinhVienID`, `LopHocPhanID`, `ThoiGianDangKy`, `TrangThai`) values (1, 11, 2026-03-07 02:06:37, DaDangKy)) in E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php:838\nStack trace:\n#0 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Connection.php(794): Illuminate\\Database\\Connection->runQueryCallback(\'insert into `da...\', Array, Object(Closure))\n#1 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\MySqlConnection.php(42): Illuminate\\Database\\Connection->run(\'insert into `da...\', Array, Object(Closure))\n#2 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Processors\\MySqlProcessor.php(35): Illuminate\\Database\\MySqlConnection->insert(\'insert into `da...\', Array, \'DangKyID\')\n#3 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Query\\Builder.php(4140): Illuminate\\Database\\Query\\Processors\\MySqlProcessor->processInsertGetId(Object(Illuminate\\Database\\Query\\Builder), \'insert into `da...\', Array, \'DangKyID\')\n#4 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(2235): Illuminate\\Database\\Query\\Builder->insertGetId(Array, \'DangKyID\')\n#5 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1436): Illuminate\\Database\\Eloquent\\Builder->__call(\'insertGetId\', Array)\n#6 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1401): Illuminate\\Database\\Eloquent\\Model->insertAndSetId(Object(Illuminate\\Database\\Eloquent\\Builder), Array)\n#7 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(1240): Illuminate\\Database\\Eloquent\\Model->performInsert(Object(Illuminate\\Database\\Eloquent\\Builder))\n#8 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1219): Illuminate\\Database\\Eloquent\\Model->save()\n#9 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\helpers.php(388): Illuminate\\Database\\Eloquent\\Builder->Illuminate\\Database\\Eloquent\\{closure}(Object(App\\Models\\DangKyHocPhan))\n#10 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Builder.php(1218): tap(Object(App\\Models\\DangKyHocPhan), Object(Closure))\n#11 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Traits\\ForwardsCalls.php(23): Illuminate\\Database\\Eloquent\\Builder->create(Array)\n#12 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2540): Illuminate\\Database\\Eloquent\\Model->forwardCallTo(Object(Illuminate\\Database\\Eloquent\\Builder), \'create\', Array)\n#13 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Eloquent\\Model.php(2556): Illuminate\\Database\\Eloquent\\Model->__call(\'create\', Array)\n#14 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(67): Illuminate\\Database\\Eloquent\\Model::__callStatic(\'create\', Array)\n#15 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\Concerns\\ManagesTransactions.php(35): App\\Jobs\\ProcessDangKyHocPhan->App\\Jobs\\{closure}(Object(Illuminate\\Database\\MySqlConnection))\n#16 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Database\\DatabaseManager.php(491): Illuminate\\Database\\Connection->transaction(Object(Closure))\n#17 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Support\\Facades\\Facade.php(363): Illuminate\\Database\\DatabaseManager->__call(\'transaction\', Array)\n#18 E:\\TruongHoc\\BackEnd\\app\\Jobs\\ProcessDangKyHocPhan.php(45): Illuminate\\Support\\Facades\\Facade::__callStatic(\'transaction\', Array)\n#19 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): App\\Jobs\\ProcessDangKyHocPhan->handle(Object(App\\Services\\DangKyHocPhanService))\n#20 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#21 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#22 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#23 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#24 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(129): Illuminate\\Container\\Container->call(Array)\n#25 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Bus\\Dispatcher->Illuminate\\Bus\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#26 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#27 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Bus\\Dispatcher.php(133): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#28 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(136): Illuminate\\Bus\\Dispatcher->dispatchNow(Object(App\\Jobs\\ProcessDangKyHocPhan), false)\n#29 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(180): Illuminate\\Queue\\CallQueuedHandler->Illuminate\\Queue\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#30 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Pipeline\\Pipeline.php(137): Illuminate\\Pipeline\\Pipeline->Illuminate\\Pipeline\\{closure}(Object(App\\Jobs\\ProcessDangKyHocPhan))\n#31 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(129): Illuminate\\Pipeline\\Pipeline->then(Object(Closure))\n#32 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\CallQueuedHandler.php(70): Illuminate\\Queue\\CallQueuedHandler->dispatchThroughMiddleware(Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(App\\Jobs\\ProcessDangKyHocPhan))\n#33 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Jobs\\Job.php(102): Illuminate\\Queue\\CallQueuedHandler->call(Object(Illuminate\\Queue\\Jobs\\RedisJob), Array)\n#34 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(485): Illuminate\\Queue\\Jobs\\Job->fire()\n#35 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(435): Illuminate\\Queue\\Worker->process(\'redis\', Object(Illuminate\\Queue\\Jobs\\RedisJob), Object(Illuminate\\Queue\\WorkerOptions))\n#36 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Worker.php(201): Illuminate\\Queue\\Worker->runJob(Object(Illuminate\\Queue\\Jobs\\RedisJob), \'redis\', Object(Illuminate\\Queue\\WorkerOptions))\n#37 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(148): Illuminate\\Queue\\Worker->daemon(\'redis\', \'registration,de...\', Object(Illuminate\\Queue\\WorkerOptions))\n#38 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Queue\\Console\\WorkCommand.php(131): Illuminate\\Queue\\Console\\WorkCommand->runWorker(\'redis\', \'registration,de...\')\n#39 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(36): Illuminate\\Queue\\Console\\WorkCommand->handle()\n#40 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()\n#41 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure(Object(Closure))\n#42 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure))\n#43 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Container\\Container.php(799): Illuminate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)\n#44 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(211): Illuminate\\Container\\Container->call(Array)\n#45 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Command\\Command.php(341): Illuminate\\Console\\Command->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#46 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Console\\Command.php(180): Symfony\\Component\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))\n#47 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(1117): Illuminate\\Console\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#48 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand(Object(Illuminate\\Queue\\Console\\WorkCommand), Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#49 E:\\TruongHoc\\BackEnd\\vendor\\symfony\\console\\Application.php(195): Symfony\\Component\\Console\\Application->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#50 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Console\\Kernel.php(198): Symfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#51 E:\\TruongHoc\\BackEnd\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Application.php(1235): Illuminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))\n#52 E:\\TruongHoc\\BackEnd\\artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfony\\Component\\Console\\Input\\ArgvInput))\n#53 {main}', '2026-03-06 19:06:37');

-- --------------------------------------------------------

--
-- Table structure for table `giangvien`
--

CREATE TABLE `giangvien` (
  `GiangVienID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `HoTen` varchar(100) NOT NULL,
  `HocVi` varchar(100) DEFAULT NULL,
  `ChuyenMon` varchar(100) DEFAULT NULL,
  `KhoaID` int(11) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `sodienthoai` varchar(15) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `giangvien`
--

INSERT INTO `giangvien` (`GiangVienID`, `UserID`, `HoTen`, `HocVi`, `ChuyenMon`, `KhoaID`, `email`, `sodienthoai`, `created_at`) VALUES
(1, 2, 'Trần Minh Tuấn', 'Tiến sĩ', 'Lập trình Web', 1, 'gv_new_email@example.com', '0912345678', '2026-02-24 07:31:27'),
(2, 3, 'Lê Thị Hạnh', 'Thạc sĩ', 'Cơ sở dữ liệu', 1, NULL, NULL, '2026-02-24 07:31:27'),
(3, 4, 'Phạm Văn Long', 'Thạc sĩ', 'Quản trị doanh nghiệp', 2, NULL, NULL, '2026-02-24 07:31:27'),
(11, NULL, 'ThS. Trần Văn Cường', 'Thạc sĩ', 'Công nghệ phần mềm', 1, 'cuong.tv@school.edu.vn', '0988111222', '2026-03-13 19:06:02');

-- --------------------------------------------------------

--
-- Table structure for table `hethong_log`
--

CREATE TABLE `hethong_log` (
  `LogID` bigint(20) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `HanhDong` varchar(100) NOT NULL,
  `MoTa` text DEFAULT NULL,
  `BangLienQuan` varchar(50) DEFAULT NULL,
  `IDBanGhi` int(11) DEFAULT NULL,
  `IP` varchar(45) DEFAULT NULL,
  `UserAgent` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hethong_log`
--

INSERT INTO `hethong_log` (`LogID`, `UserID`, `HanhDong`, `MoTa`, `BangLienQuan`, `IDBanGhi`, `IP`, `UserAgent`, `created_at`) VALUES
(1, NULL, 'DangKyHocPhanMoi', 'Đăng ký học phần thành công - SV: 1 - Lớp HP: 11', 'dangkyhocphan', 29, NULL, NULL, '2026-03-04 10:06:59'),
(2, NULL, 'DangKyHocPhanMoi', 'Đăng ký học phần thành công - SV: 1 - Lớp HP: 11', 'dangkyhocphan', 36, NULL, NULL, '2026-03-04 10:57:40'),
(3, NULL, 'DangKyHocPhanMoi', 'Đăng ký học phần thành công - SV: 1 - Lớp HP: 11', 'dangkyhocphan', 40, NULL, NULL, '2026-03-04 11:10:59'),
(4, NULL, 'DangKyHocPhanMoi', 'Đăng ký học phần thành công - SV: 1 - Lớp HP: 11', 'dangkyhocphan', 43, NULL, NULL, '2026-03-06 12:21:25'),
(5, NULL, 'DangKyHocPhanMoi', 'Đăng ký học phần thành công - SV: 1 - Lớp HP: 11', 'dangkyhocphan', 44, NULL, NULL, '2026-03-06 12:27:41'),
(6, 2, 'NhapDiem', 'Cập nhật điểm cho bản ghi đăng ký ID: 1', 'diemso', 1, NULL, NULL, '2026-03-06 16:30:58'),
(7, 2, 'NhapDiem', 'Cập nhật điểm cho bản ghi đăng ký ID: 1', 'diemso', 1, NULL, NULL, '2026-03-07 09:50:56'),
(8, 1, 'ĐÓNG_ĐĂNG_KÝ', 'Đóng đợt đăng ký học phần ID 11', 'dotdangky', 11, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-12 23:54:53'),
(9, 1, 'MỞ_ĐĂNG_KÝ', 'Mở đợt đăng ký: Đợt đăng ký Học kỳ 1', 'dotdangky', 12, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-12 23:55:08'),
(10, 1, 'DOI_TRANG_THAI_DOT', 'Khóa cứng đợt đăng ký ID: 11', 'dotdangky', 11, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 00:16:18'),
(11, 1, 'CAP_NHAT_DOT', 'Cập nhật thời gian đợt ID 11: 2024-07-01 07:30:00 -> 2024-07-15 17:00:00', 'dotdangky', 11, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 00:19:19'),
(12, 1, 'CAP_NHAT_DOT', 'Cập nhật thời gian đợt ID 11: 2024-07-01 07:30:00 -> 2024-07-15 17:00:00', 'dotdangky', 11, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 00:23:57'),
(13, 1, 'CAP_NHAT_DOT', 'Cập nhật đợt ID 11: 2024-07-01 07:30:00 → 2024-07-15 17:00:00', 'dotdangky', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 00:34:42'),
(14, 1, 'DOI_TRANG_THAI_DOT', 'Khóa cứng đợt đăng ký ID: 11', 'dotdangky', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 00:38:03'),
(15, 1, 'TAO_LOP_HOC_PHAN', 'Tạo lớp CT001-2025HK1-01 (ID: 13)', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 01:10:16'),
(16, 1, 'TAO_LOP_HOC_PHAN', 'Tạo lớp CT001-2025HK1-02 (ID: 14)', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 01:12:26'),
(17, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp CT001-2025HK1-03', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 01:29:44'),
(18, 1, 'THEM_LICH_THI', 'Thêm lịch thi cho lớp IT101-01', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 01:49:03'),
(19, 1, 'THEM_LICH_HOC', 'Thêm lịch học cho lớp IT101-01', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 01:50:57'),
(20, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp CT001-2025HK1-03', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 01:59:54'),
(21, 1, 'DOI_TRANG_THAI_DOT', 'Kích hoạt đợt đăng ký ID: 11', 'dotdangky', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:01:48'),
(22, 1, 'TAO_LOP_HOC_PHAN', 'Tạo lớp IT001-HK1-2025-K23 (ID: 15)', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:50:45'),
(23, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp CT001-2025HK1-03', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:51:20'),
(24, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp CT001-2025HK1-03', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:51:40'),
(25, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp IT001-HK1-2025-K23', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:52:53'),
(26, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp IT001-HK1-2025-K23', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:53:06'),
(27, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp IT001-HK1-2025-K23', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:53:14'),
(28, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp IT101-01', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:55:29'),
(29, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp IT101-01', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:56:37'),
(30, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp IT101-01', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 03:56:43'),
(31, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp IT101-01', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 04:07:08'),
(32, 1, 'CAP_NHAT_LOP_HP', 'Cập nhật lớp IT001-HK1-2025-K23', 'lophocphan', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 04:07:29'),
(33, 1, 'CREATE', 'Tạo môn học: Cấu trúc dữ liệu và Giải thuật', 'monhoc', 16, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 23:16:12'),
(34, 1, 'UPDATE', 'Cập nhật môn học: Cấu trúc dữ liệu và Giải thuật (Nâng cao)', 'monhoc', 1, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-13 23:17:17'),
(35, 1, 'NhapDiem', 'Cập nhật điểm cho bản ghi đăng ký ID: 1', 'diemso', 1, NULL, NULL, '2026-03-16 05:40:07'),
(36, 1, 'NhapDiem', 'Cập nhật điểm cho bản ghi đăng ký ID: 2', 'diemso', 2, NULL, NULL, '2026-03-16 05:40:07'),
(37, 1, 'Cập nhật điểm học phần', 'Người dùng ID 1 đã cập nhật điểm cho lớp HP ID 1', 'lophocphan', 1, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-15 22:40:07'),
(38, 1, 'Cập nhật điểm rèn luyện', 'Cập nhật điểm rèn luyện học kỳ ID 1', 'diemrenluyen', NULL, '127.0.0.1', 'PostmanRuntime/7.51.1', '2026-03-15 22:41:05');

-- --------------------------------------------------------

--
-- Table structure for table `hocky`
--

CREATE TABLE `hocky` (
  `HocKyID` int(11) NOT NULL,
  `NamHocID` int(11) DEFAULT NULL,
  `TenHocKy` varchar(50) DEFAULT NULL,
  `LoaiHocKy` enum('HK1','HK2','He') DEFAULT NULL,
  `NgayBatDau` date DEFAULT NULL,
  `NgayKetThuc` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hocky`
--

INSERT INTO `hocky` (`HocKyID`, `NamHocID`, `TenHocKy`, `LoaiHocKy`, `NgayBatDau`, `NgayKetThuc`) VALUES
(1, 1, 'Học kỳ 1', 'HK1', NULL, NULL),
(2, 1, 'Học kỳ 2', 'HK2', NULL, NULL),
(3, 1, 'Học kỳ hè', 'He', NULL, NULL),
(4, 2, 'Học kỳ 1', 'HK1', NULL, NULL),
(5, 2, 'Học kỳ 2', 'HK2', NULL, NULL),
(11, 11, 'Học kỳ 1', 'HK1', NULL, NULL),
(12, 1, 'Học kỳ 1 - 2025-2026', 'HK1', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `hocphi`
--

CREATE TABLE `hocphi` (
  `HocPhiID` int(11) NOT NULL,
  `SinhVienID` int(11) DEFAULT NULL,
  `HocKyID` int(11) DEFAULT NULL,
  `TongTien` decimal(15,2) DEFAULT NULL,
  `DaNop` decimal(15,2) DEFAULT 0.00,
  `HanNop` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hocphi`
--

INSERT INTO `hocphi` (`HocPhiID`, `SinhVienID`, `HocKyID`, `TongTien`, `DaNop`, `HanNop`) VALUES
(1, 1, 1, 4200000.00, 4200000.00, '2024-10-30'),
(2, 2, 1, 4200000.00, 3000000.00, '2024-10-30'),
(3, 3, 1, 2100000.00, 2100000.00, '2024-10-30'),
(4, 4, 1, 4200000.00, 4200000.00, '2024-10-30'),
(5, 5, 1, 2100000.00, 2100000.00, '2024-10-30'),
(6, 6, 1, 2100000.00, 0.00, '2024-10-30'),
(7, 1, 1, 4200000.00, 4200000.00, '2024-10-30'),
(8, 2, 1, 4200000.00, 3000000.00, '2024-10-30'),
(9, 3, 1, 2100000.00, 2100000.00, '2024-10-30'),
(10, 4, 1, 4200000.00, 4200000.00, '2024-10-30'),
(11, 5, 1, 2100000.00, 2100000.00, '2024-10-30'),
(12, 6, 1, 2100000.00, 0.00, '2024-10-30'),
(13, 1, 1, 4200000.00, 4200000.00, '2024-10-30'),
(14, 2, 1, 4200000.00, 3000000.00, '2024-10-30'),
(15, 3, 1, 2100000.00, 2100000.00, '2024-10-30'),
(16, 4, 1, 4200000.00, 4200000.00, '2024-10-30'),
(17, 5, 1, 2100000.00, 2100000.00, '2024-10-30'),
(18, 6, 1, 2100000.00, 0.00, '2024-10-30');

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL,
  `reserved_at` int(10) UNSIGNED DEFAULT NULL,
  `available_at` int(10) UNSIGNED NOT NULL,
  `created_at` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `khoa`
--

CREATE TABLE `khoa` (
  `KhoaID` int(11) NOT NULL,
  `MaKhoa` varchar(20) NOT NULL,
  `TenKhoa` varchar(100) NOT NULL,
  `DienThoai` varchar(20) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `khoa`
--

INSERT INTO `khoa` (`KhoaID`, `MaKhoa`, `TenKhoa`, `DienThoai`, `Email`) VALUES
(1, 'CNTT', 'Khoa Công nghệ thông tin', '0281234567', 'cntt@university.edu'),
(2, 'KT', 'Khoa Kinh tế', '0289876543', 'kinhte@university.edu'),
(11, '', 'Khoa Công nghệ thông tin', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `lichhoc`
--

CREATE TABLE `lichhoc` (
  `LichHocID` int(11) NOT NULL,
  `LopHocPhanID` int(11) NOT NULL,
  `NgayHoc` date NOT NULL,
  `BuoiHoc` varchar(30) NOT NULL,
  `TietBatDau` tinyint(4) NOT NULL,
  `SoTiet` tinyint(4) NOT NULL DEFAULT 3,
  `PhongHoc` varchar(50) DEFAULT NULL,
  `GhiChu` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lichhoc`
--

INSERT INTO `lichhoc` (`LichHocID`, `LopHocPhanID`, `NgayHoc`, `BuoiHoc`, `TietBatDau`, `SoTiet`, `PhongHoc`, `GhiChu`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-03-15', 'Sáng', 1, 3, 'A1.102', 'Học bù tiết 1-3', '2026-03-13 01:50:57', '2026-03-13 01:50:57'),
(2, 1, '2024-05-21', 'Chiều', 7, 3, 'B2-202', 'Học bù', '2026-03-14 00:18:07', '2026-03-14 00:21:40');

-- --------------------------------------------------------

--
-- Table structure for table `lichthi`
--

CREATE TABLE `lichthi` (
  `LichThiID` int(11) NOT NULL,
  `LopHocPhanID` int(11) NOT NULL,
  `NgayThi` date NOT NULL,
  `GioBatDau` time NOT NULL,
  `GioKetThuc` time NOT NULL,
  `PhongThi` varchar(50) DEFAULT NULL,
  `HinhThucThi` enum('TracNghiem','TuLuan','ThucHanh','TongHop') DEFAULT 'TracNghiem',
  `GhiChu` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lichthi`
--

INSERT INTO `lichthi` (`LichThiID`, `LopHocPhanID`, `NgayThi`, `GioBatDau`, `GioKetThuc`, `PhongThi`, `HinhThucThi`, `GhiChu`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-06-20', '07:30:00', '09:30:00', 'B2.205', 'TracNghiem', 'Mang theo thẻ sinh viên', '2026-03-13 01:49:03', '2026-03-13 01:49:03'),
(2, 1, '2024-06-15', '07:30:00', '09:30:00', 'Hội trường B', 'TuLuan', NULL, '2026-03-14 00:23:13', '2026-03-14 00:24:59');

-- --------------------------------------------------------

--
-- Table structure for table `lophocphan`
--

CREATE TABLE `lophocphan` (
  `LopHocPhanID` int(11) NOT NULL,
  `MonHocID` int(11) DEFAULT NULL,
  `HocKyID` int(11) DEFAULT NULL,
  `GiangVienID` int(11) DEFAULT NULL,
  `MaLopHP` varchar(50) DEFAULT NULL,
  `SoLuongToiDa` int(11) DEFAULT NULL,
  `KhoahocAllowed` varchar(255) DEFAULT NULL,
  `NgayBatDau` date DEFAULT NULL,
  `NgayKetThuc` date DEFAULT NULL,
  `TrangThaiNhapDiem` tinyint(4) DEFAULT 0 COMMENT '0: Mo, 1: Khoa'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lophocphan`
--

INSERT INTO `lophocphan` (`LopHocPhanID`, `MonHocID`, `HocKyID`, `GiangVienID`, `MaLopHP`, `SoLuongToiDa`, `KhoahocAllowed`, `NgayBatDau`, `NgayKetThuc`, `TrangThaiNhapDiem`) VALUES
(1, 1, 1, 2, 'IT101-01', 910, 'K3,K2', NULL, NULL, 0),
(2, 2, 1, 2, 'CT001-2025HK1-03', 65, 'K1,K2,K3,K4', '2025-09-05', '2025-12-28', 0),
(3, 7, 1, 3, 'KT101-01', 80, 'K1,K2,K3,K4', NULL, NULL, 0),
(4, 8, 1, 3, 'KT102-01', 80, 'K1,K2,K3,K4', NULL, NULL, 0),
(11, 1, 11, 1, 'IT101-E11', 50, 'K1,K2,K3,K4', NULL, NULL, 0),
(12, 2, 11, 2, 'IT102-E11', 50, 'K1,K2,K3,K4', NULL, NULL, 0),
(13, 1, 2, 1, 'CT001-2025HK1-01', 60, 'K1,K2,K3,K4', '2025-09-01', '2025-12-31', 0),
(14, 1, 2, 1, 'CT001-2025HK1-02', 60, 'K1,K2,K3,K4', '2025-09-02', '2025-12-31', 0),
(15, 1, 3, 2, 'IT001-HK1-2025-K23', 10, 'K3,K2', '2025-09-01', '2025-12-31', 0);

-- --------------------------------------------------------

--
-- Table structure for table `lopsinhhoat`
--

CREATE TABLE `lopsinhhoat` (
  `LopSinhHoatID` int(11) NOT NULL,
  `MaLop` varchar(20) NOT NULL,
  `TenLop` varchar(100) DEFAULT NULL,
  `KhoaID` int(11) NOT NULL,
  `GiangVienID` int(11) DEFAULT NULL,
  `NamNhapHoc` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lopsinhhoat`
--

INSERT INTO `lopsinhhoat` (`LopSinhHoatID`, `MaLop`, `TenLop`, `KhoaID`, `GiangVienID`, `NamNhapHoc`) VALUES
(1, 'CNTT2024A', 'CNTT Khóa 2024 A', 1, 1, 2024),
(2, 'CNTT2024B', 'CNTT Khóa 2024 B', 1, 2, 2024),
(3, 'KT2024A', 'Kinh tế Khóa 2024 A', 2, 3, 2024),
(6, 'K24-CNTT01', 'Công nghệ thông tin 01 - Khóa 24', 1, 2, 2024),
(7, 'K24-CNTT011', 'Công nghệ thông tin 01 - Khóa 24', 1, 2, 2024);

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `monhoc`
--

CREATE TABLE `monhoc` (
  `MonHocID` int(11) NOT NULL,
  `MaMon` varchar(20) NOT NULL,
  `TenMon` varchar(100) NOT NULL,
  `SoTinChi` int(11) NOT NULL,
  `TietLyThuyet` int(11) DEFAULT NULL,
  `TietThucHanh` int(11) DEFAULT NULL,
  `KhoaID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `monhoc`
--

INSERT INTO `monhoc` (`MonHocID`, `MaMon`, `TenMon`, `SoTinChi`, `TietLyThuyet`, `TietThucHanh`, `KhoaID`) VALUES
(1, 'IT101', 'Cấu trúc dữ liệu và Giải thuật (Nâng cao)', 3, 30, 30, 1),
(2, 'IT102', 'Cơ sở dữ liệu', 3, 30, 30, 1),
(3, 'IT103', 'Cấu trúc dữ liệu', 3, 30, 30, 1),
(4, 'IT104', 'Lập trình Web', 3, 30, 30, 1),
(5, 'IT105', 'Phân tích thiết kế hệ thống', 3, 30, 15, 1),
(6, 'IT106', 'Mạng máy tính', 3, 30, 15, 1),
(7, 'KT101', 'Nguyên lý kế toán', 3, 45, 0, 2),
(8, 'KT102', 'Quản trị học', 3, 45, 0, 2),
(9, 'KT103', 'Marketing căn bản', 3, 45, 0, 2),
(10, 'KT104', 'Tài chính doanh nghiệp', 3, 45, 0, 2),
(11, 'KT105', 'Kinh tế vi mô', 3, 45, 0, 2),
(12, 'KT106', 'Kinh tế vĩ mô', 3, 45, 0, 2),
(13, 'INT1306', 'Cấu trúc dữ liệu và Giải thuật', 3, 0, 0, 1),
(14, 'INT13061', 'Cấu trúc dữ liệu và Giải thuật', 3, 0, 0, 1),
(15, 'INT130611', 'Cấu trúc dữ liệu và Giải thuật', 3, 0, 0, 1),
(16, 'INT1306111', 'Cấu trúc dữ liệu và Giải thuật', 3, 0, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `monhoc_songhanh`
--

CREATE TABLE `monhoc_songhanh` (
  `ID` int(11) NOT NULL,
  `MonHocID` int(11) NOT NULL,
  `MonSongHanhID` int(11) NOT NULL,
  `GhiChu` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `namhoc`
--

CREATE TABLE `namhoc` (
  `NamHocID` int(11) NOT NULL,
  `TenNamHoc` varchar(50) DEFAULT NULL,
  `NgayBatDau` date DEFAULT NULL,
  `NgayKetThuc` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `namhoc`
--

INSERT INTO `namhoc` (`NamHocID`, `TenNamHoc`, `NgayBatDau`, `NgayKetThuc`) VALUES
(1, '2024-2025', '2024-09-01', '2025-06-30'),
(2, '2025-2026', '2025-09-01', '2026-06-30'),
(11, '2025-2026', '2025-09-01', '2026-09-16'),
(12, '2027-2028', '2025-09-01', '2026-08-31');

-- --------------------------------------------------------

--
-- Table structure for table `nganhdaotao`
--

CREATE TABLE `nganhdaotao` (
  `NganhID` int(11) NOT NULL,
  `MaNganh` varchar(20) NOT NULL,
  `TenNganh` varchar(100) NOT NULL,
  `KhoaID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `nganhdaotao`
--

INSERT INTO `nganhdaotao` (`NganhID`, `MaNganh`, `TenNganh`, `KhoaID`) VALUES
(1, 'CNTT01', 'Kỹ thuật phần mềm', 1),
(2, 'CNTT02', 'Hệ thống thông tin', 1),
(3, 'KT01', 'Quản trị kinh doanh', 2),
(4, 'KT02', 'Tài chính ngân hàng', 2),
(5, '', 'Công nghệ thông tin', 1);

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `RoleID` int(11) NOT NULL,
  `RoleName` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`RoleID`, `RoleName`) VALUES
(1, 'ADMIN'),
(2, 'GIANGVIEN'),
(3, 'SINHVIEN');

-- --------------------------------------------------------

--
-- Table structure for table `sinhvien`
--

CREATE TABLE `sinhvien` (
  `SinhVienID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `MaSV` varchar(20) NOT NULL,
  `khoahoc` varchar(50) DEFAULT NULL,
  `HoTen` varchar(100) NOT NULL,
  `NgaySinh` date DEFAULT NULL,
  `KhoaID` int(11) NOT NULL,
  `NganhID` int(11) NOT NULL,
  `TinhTrang` enum('DangHoc','BaoLuu','TotNghiep') DEFAULT 'DangHoc',
  `LopSinhHoatID` int(11) DEFAULT NULL,
  `gioitinh` tinyint(4) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `sodienthoai` varchar(10) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sinhvien`
--

INSERT INTO `sinhvien` (`SinhVienID`, `UserID`, `MaSV`, `khoahoc`, `HoTen`, `NgaySinh`, `KhoaID`, `NganhID`, `TinhTrang`, `LopSinhHoatID`, `gioitinh`, `email`, `sodienthoai`, `created_at`) VALUES
(1, 5, 'SV001', 'K2', 'Nguyễn Văn A', '2004-03-12', 1, 1, 'DangHoc', NULL, NULL, 'trieung2301@gmail.com', '0918123456', '2026-02-24 07:27:55'),
(2, 6, 'SV002', 'K2', 'Trần Thị B', '2004-07-21', 1, 2, 'DangHoc', 1, NULL, NULL, NULL, '2026-02-24 07:27:55'),
(3, 7, 'SV003', 'K1', 'Lê Văn C', '2003-11-05', 1, 1, 'DangHoc', 7, NULL, NULL, NULL, '2026-02-24 07:27:55'),
(4, 8, 'SV004', 'K3', 'Phạm Thị D', '2004-01-15', 2, 3, 'DangHoc', 7, NULL, NULL, NULL, '2026-02-24 07:27:55'),
(5, 9, 'SV005', 'K3', 'Nguyễn Văn E', '2003-09-30', 2, 4, 'DangHoc', NULL, NULL, NULL, NULL, '2026-02-24 07:27:55'),
(6, 10, 'SV006', 'K4', 'Hoàng Thị F', '2004-06-18', 2, 3, 'DangHoc', NULL, NULL, NULL, NULL, '2026-02-24 07:27:55'),
(11, 11, '21001234', NULL, 'Nguyễn Văn An', NULL, 1, 2, 'DangHoc', NULL, NULL, NULL, '0912345678', '2026-03-13 18:58:23'),
(12, 13, '1111111111', 'K25', 'Nguyễn Văn An', NULL, 1, 2, 'DangHoc', NULL, NULL, 'an.nv@gmail.com', '0912345678', '2026-03-13 19:04:40');

--
-- Triggers `sinhvien`
--
DELIMITER $$
CREATE TRIGGER `trg_after_update_sinhvien_thongtin` AFTER UPDATE ON `sinhvien` FOR EACH ROW BEGIN
    IF OLD.Email <> NEW.Email OR OLD.SoDienThoai <> NEW.SoDienThoai OR OLD.HoTen <> NEW.HoTen THEN
        INSERT INTO hethong_log (
            UserID, HanhDong, MoTa, BangLienQuan, IDBanGhi
        )
        VALUES (
            NULL,
            'CapNhatThongTinSV',
            CONCAT('Cập nhật thông tin SV: ', OLD.SinhVienID, ' (Email/Điện thoại/Họ tên)'),
            'sinhvien',
            OLD.SinhVienID,
            CURRENT_TIMESTAMP
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `thanhtoanhocphi`
--

CREATE TABLE `thanhtoanhocphi` (
  `ThanhToanID` int(11) NOT NULL,
  `HocPhiID` int(11) DEFAULT NULL,
  `SoTien` decimal(15,2) DEFAULT NULL,
  `NgayThanhToan` datetime DEFAULT current_timestamp(),
  `HinhThuc` enum('TienMat','ChuyenKhoan','Online') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `thanhtoanhocphi`
--

INSERT INTO `thanhtoanhocphi` (`ThanhToanID`, `HocPhiID`, `SoTien`, `NgayThanhToan`, `HinhThuc`) VALUES
(1, 1, 4200000.00, '2026-02-24 10:35:51', 'ChuyenKhoan'),
(2, 2, 3000000.00, '2026-02-24 10:35:51', 'Online'),
(3, 3, 2100000.00, '2026-02-24 10:35:51', 'TienMat'),
(4, 4, 4200000.00, '2026-02-24 10:35:51', 'Online'),
(5, 5, 2100000.00, '2026-02-24 10:35:51', 'ChuyenKhoan'),
(6, 1, 4200000.00, '2026-02-24 10:38:18', 'ChuyenKhoan'),
(7, 2, 3000000.00, '2026-02-24 10:38:18', 'Online'),
(8, 3, 2100000.00, '2026-02-24 10:38:18', 'TienMat'),
(9, 4, 4200000.00, '2026-02-24 10:38:18', 'Online'),
(10, 5, 2100000.00, '2026-02-24 10:38:18', 'ChuyenKhoan'),
(11, 1, 4200000.00, '2026-02-24 10:40:02', 'ChuyenKhoan'),
(12, 2, 3000000.00, '2026-02-24 10:40:02', 'Online'),
(13, 3, 2100000.00, '2026-02-24 10:40:02', 'TienMat'),
(14, 4, 4200000.00, '2026-02-24 10:40:02', 'Online'),
(15, 5, 2100000.00, '2026-02-24 10:40:02', 'ChuyenKhoan');

--
-- Triggers `thanhtoanhocphi`
--
DELIMITER $$
CREATE TRIGGER `trg_after_insert_thanhtoanhocphi` AFTER INSERT ON `thanhtoanhocphi` FOR EACH ROW BEGIN
    UPDATE hocphi
    SET DaNop = DaNop + NEW.SoTien,
        updated_at = CURRENT_TIMESTAMP
    WHERE HocPhiID = NEW.HocPhiID;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `thongbao`
--

CREATE TABLE `thongbao` (
  `ThongBaoID` int(11) NOT NULL,
  `TieuDe` varchar(255) NOT NULL,
  `NoiDung` text NOT NULL,
  `LoaiThongBao` varchar(255) DEFAULT NULL,
  `NguoiGuiID` int(11) DEFAULT NULL,
  `DoiTuong` varchar(100) DEFAULT 'TatCa',
  `NgayBatDauHienThi` date DEFAULT NULL,
  `NgayKetThucHienThi` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `thongbao`
--

INSERT INTO `thongbao` (`ThongBaoID`, `TieuDe`, `NoiDung`, `LoaiThongBao`, `NguoiGuiID`, `DoiTuong`, `NgayBatDauHienThi`, `NgayKetThucHienThi`, `created_at`) VALUES
(1, 'Thông báo mở đăng ký học phần', 'Sinh viên lưu ý thời gian đăng ký học phần từ ngày 20/03...', 'HocPhan', 1, 'SinhVien', '2026-03-16', '2026-03-30', '2026-03-16 00:29:39'),
(2, 'Thông báo mở đăng ký học phần', 'Sinh viên lưu ý thời gian đăng ký học phần từ ngày 20/03...', 'HocPhan', 1, 'SinhVien', '2026-03-16', '2026-03-30', '2026-03-16 00:31:00'),
(3, 'Thông báo mở đăng ký học phần', 'Sinh viên lưu ý thời gian đăng ký học phần từ ngày 20/03...', 'HocPhan', 1, 'SinhVien', '2026-03-16', '2026-03-30', '2026-03-16 00:31:53'),
(4, 'Thông báo mở đăng ký học phần', 'Sinh viên lưu ý thời gian đăng ký học phần từ ngày 20/03...', 'HocPhan', 1, 'SinhVien', '2026-03-16', '2026-03-30', '2026-03-16 00:34:08');

-- --------------------------------------------------------

--
-- Table structure for table `tieuchirenluyen`
--

CREATE TABLE `tieuchirenluyen` (
  `TieuChiID` int(11) NOT NULL,
  `TenTieuChi` varchar(255) NOT NULL,
  `DiemToiDa` int(11) NOT NULL,
  `ThuTu` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tieuchirenluyen`
--

INSERT INTO `tieuchirenluyen` (`TieuChiID`, `TenTieuChi`, `DiemToiDa`, `ThuTu`) VALUES
(1, 'Ý thức học tập', 20, 1),
(2, 'Chấp hành nội quy', 20, 2),
(3, 'Tham gia phong trào', 25, 3),
(4, 'Công tác lớp đoàn hội', 20, 4),
(5, 'Quan hệ cộng đồng', 15, 5),
(6, 'Ý thức học tập', 20, 1),
(7, 'Chấp hành nội quy', 20, 2),
(8, 'Tham gia phong trào', 25, 3),
(9, 'Công tác lớp đoàn hội', 20, 4),
(10, 'Quan hệ cộng đồng', 15, 5),
(11, 'Ý thức học tập', 20, 1),
(12, 'Chấp hành nội quy', 20, 2),
(13, 'Tham gia phong trào', 25, 3),
(14, 'Công tác lớp đoàn hội', 20, 4),
(15, 'Quan hệ cộng đồng', 15, 5);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `UserID` int(11) NOT NULL,
  `Username` varchar(50) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `RoleID` int(11) NOT NULL,
  `is_active` bit(1) NOT NULL DEFAULT b'1',
  `CreatedAt` datetime DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`UserID`, `Username`, `PasswordHash`, `Email`, `RoleID`, `is_active`, `CreatedAt`, `created_at`) VALUES
(1, 'admin01', '$2y$12$RNMG9yuqExbmvCxhzGGYuuH/uJ2Q.pibSR1JG.kRqeu0CDb48H.v6', 'admin01@uni.edu', 1, b'1', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(2, 'gv01', '$2y$12$YZCpAMfkARdIQyetzAUhEumbqcYW6ItgIyCQ4uruONtdJUuVy9yWS', 'gv01@uni.edu', 2, b'1', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(3, 'gv02', '123456', 'gv02@uni.edu', 2, b'1', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(4, 'gv03', '123456', 'gv03@uni.edu', 2, b'0', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(5, 'svcntt01', '$2y$12$hQ2OJc0pe0V.8U9I3HXfzu7YU4/02DGNAuSXPxPpdiKtYQrVxzs5y', 'svcntt01@uni.edu', 3, b'1', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(6, 'svcntt02', '123456', 'svcntt02@uni.edu', 3, b'1', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(7, 'svcntt03', '123456', 'svcntt03@uni.edu', 3, b'1', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(8, 'svkt01', '$2y$12$RNMG9yuqExbmvCxhzGGYuuH/uJ2Q.pibSR1JG.kRqeu0CDb48H.v6', 'svkt01@uni.edu', 3, b'1', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(9, 'svkt02', '123456', 'svkt02@uni.edu', 3, b'1', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(10, 'svkt03', '123456', 'svkt03@uni.edu', 3, b'1', '2026-02-24 10:22:04', '2026-02-24 07:28:30'),
(11, '21001234', '$2y$12$W8XpbYDwrP6ePQR9.GGmVODZ9NkHuK/yYfyFHTBoxilBQMmVZWTJ.', NULL, 3, b'1', '2026-03-14 08:58:23', '2026-03-14 01:58:23'),
(13, '1111111111', '$2y$12$SIkQHKr0BkDXnRBXjFfCJO59Y2451433mwFjUuzw8dv/NuJRMWh9G', NULL, 3, b'1', '2026-03-14 09:04:40', '2026-03-14 02:04:40'),
(14, 'gv_cuongtv', '$2y$12$.FTZk0LITm/.yjIGwoFabORlh/FtS81/Bim6HAwf5B.g1Ty7npwnq', NULL, 2, b'1', '2026-03-14 09:06:22', '2026-03-14 02:06:22');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_bangdiem_lop_hoc_phan`
-- (See below for the actual view)
--
CREATE TABLE `v_bangdiem_lop_hoc_phan` (
`LopHocPhanID` int(11)
,`MaLopHP` varchar(50)
,`TenMon` varchar(100)
,`TenHocKy` varchar(50)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`DiemChuyenCan` decimal(4,2)
,`DiemGiuaKy` decimal(4,2)
,`DiemThi` decimal(4,2)
,`DiemTongKet` decimal(4,2)
,`DiemChu` varchar(2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_cong_no_hoc_phi_sinhvien`
-- (See below for the actual view)
--
CREATE TABLE `v_cong_no_hoc_phi_sinhvien` (
`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`TenHocKy` varchar(50)
,`HocPhiID` int(11)
,`TongTien` decimal(15,2)
,`DaNop` decimal(15,2)
,`ConNo` decimal(16,2)
,`HanNop` date
,`TrangThaiNo` varchar(13)
,`TongDaThanhToanChiTiet` decimal(37,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_dangkyhocphan_hien_tai`
-- (See below for the actual view)
--
CREATE TABLE `v_dangkyhocphan_hien_tai` (
`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`DangKyID` int(11)
,`ThoiGianDangKy` datetime
,`MaLopHP` varchar(50)
,`MaMon` varchar(20)
,`TenMon` varchar(100)
,`SoTinChi` int(11)
,`TenGiangVien` varchar(100)
,`TenHocKy` varchar(50)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_danhsach_lop_giangvien`
-- (See below for the actual view)
--
CREATE TABLE `v_danhsach_lop_giangvien` (
`GiangVienID` int(11)
,`TenGiangVien` varchar(100)
,`HocVi` varchar(100)
,`ChuyenMon` varchar(100)
,`KhoaID` int(11)
,`email` varchar(255)
,`sodienthoai` varchar(15)
,`LopHocPhanID` int(11)
,`MaLopHP` varchar(50)
,`MaMon` varchar(20)
,`TenMon` varchar(100)
,`SoTinChi` int(11)
,`NamHoc` varchar(50)
,`TenHocKy` varchar(50)
,`LoaiHocKy` enum('HK1','HK2','He')
,`SoLuongToiDa` int(11)
,`SoSinhVien` bigint(21)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_diemrenluyen_sinhvien`
-- (See below for the actual view)
--
CREATE TABLE `v_diemrenluyen_sinhvien` (
`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`HocKyID` int(11)
,`TenHocKy` varchar(50)
,`TongDiem` int(11)
,`XepLoai` varchar(50)
,`NgayDanhGia` date
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_diem_hoc_ky_sinhvien`
-- (See below for the actual view)
--
CREATE TABLE `v_diem_hoc_ky_sinhvien` (
`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`HocKyID` int(11)
,`TenHocKy` varchar(50)
,`NamHocID` int(11)
,`MaMon` varchar(20)
,`TenMon` varchar(100)
,`SoTinChi` int(11)
,`DiemChuyenCan` decimal(4,2)
,`DiemGiuaKy` decimal(4,2)
,`DiemThi` decimal(4,2)
,`DiemTongKet` decimal(4,2)
,`ThoiGianDangKy` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_dot_dangky_hien_tai`
-- (See below for the actual view)
--
CREATE TABLE `v_dot_dangky_hien_tai` (
`DotDangKyID` int(11)
,`TenDot` varchar(100)
,`TenHocKy` varchar(50)
,`LoaiHocKy` enum('HK1','HK2','He')
,`NgayBatDau` datetime
,`NgayKetThuc` datetime
,`TrangThai` tinyint(4)
,`DoiTuong` varchar(255)
,`GhiChu` text
,`ThoiGianHienTai` datetime
,`TrangThaiThucTe` varchar(6)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_gpa_hoc_ky`
-- (See below for the actual view)
--
CREATE TABLE `v_gpa_hoc_ky` (
`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`HocKyID` int(11)
,`TenHocKy` varchar(50)
,`NamHocID` int(11)
,`SoMon` bigint(21)
,`TongTinChi` decimal(32,0)
,`GPA_HocKy_TamTinh` decimal(5,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_lich_hoc_sinhvien`
-- (See below for the actual view)
--
CREATE TABLE `v_lich_hoc_sinhvien` (
`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`LichHocID` int(11)
,`LopHocPhanID` int(11)
,`NgayHoc` date
,`BuoiHoc` varchar(30)
,`TietBatDau` tinyint(4)
,`SoTiet` tinyint(4)
,`PhongHoc` varchar(50)
,`GhiChu` varchar(255)
,`TenMon` varchar(100)
,`MaLopHP` varchar(50)
,`TenGiangVien` varchar(100)
,`HocKyID` int(11)
,`TenHocKy` varchar(50)
,`NamHocID` int(11)
,`TenNamHoc` varchar(50)
,`NgayBatDauLop` date
,`NgayKetThucLop` date
,`NgayBatDauHocKy` date
,`NgayKetThucHocKy` date
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_lich_thi_sinhvien`
-- (See below for the actual view)
--
CREATE TABLE `v_lich_thi_sinhvien` (
`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`LichThiID` int(11)
,`LopHocPhanID` int(11)
,`NgayThi` date
,`GioBatDau` time
,`GioKetThuc` time
,`PhongThi` varchar(50)
,`HinhThucThi` enum('TracNghiem','TuLuan','ThucHanh','TongHop')
,`GhiChu` varchar(255)
,`TenMon` varchar(100)
,`MaLopHP` varchar(50)
,`TenGiangVien` varchar(100)
,`HocKyID` int(11)
,`TenHocKy` varchar(50)
,`NamHocID` int(11)
,`TenNamHoc` varchar(50)
,`NgayBatDauLop` date
,`NgayKetThucLop` date
,`NgayBatDauHocKy` date
,`NgayKetThucHocKy` date
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_lophocphan_mo_dangky`
-- (See below for the actual view)
--
CREATE TABLE `v_lophocphan_mo_dangky` (
`LopHocPhanID` int(11)
,`MaLopHP` varchar(50)
,`MaMon` varchar(20)
,`TenMon` varchar(100)
,`SoTinChi` int(11)
,`TenGiangVien` varchar(100)
,`TenHocKy` varchar(50)
,`TenDot` varchar(100)
,`NgayBatDau` datetime
,`NgayKetThuc` datetime
,`TrangThaiDot` tinyint(4)
,`SoLuongToiDa` int(11)
,`SoLuongDaDangKy` bigint(21)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_sinhvien_chuongtrinhdaotao`
-- (See below for the actual view)
--
CREATE TABLE `v_sinhvien_chuongtrinhdaotao` (
`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`MaNganh` varchar(20)
,`TenNganh` varchar(100)
,`MaMon` varchar(20)
,`TenMon` varchar(100)
,`SoTinChi` int(11)
,`HocKyGoiY` int(11)
,`BatBuoc` tinyint(1)
,`KhoaID` int(11)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_sinhvien_lop_sinh_hoat`
-- (See below for the actual view)
--
CREATE TABLE `v_sinhvien_lop_sinh_hoat` (
`LopSinhHoatID` int(11)
,`MaLop` varchar(20)
,`TenLop` varchar(100)
,`NamNhapHoc` int(11)
,`TenKhoa` varchar(100)
,`TenCoVan` varchar(100)
,`EmailCoVan` varchar(255)
,`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTen` varchar(100)
,`NgaySinh` date
,`Email` varchar(255)
,`SoDienThoai` varchar(10)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_sinhvien_trong_lop_hoc_phan`
-- (See below for the actual view)
--
CREATE TABLE `v_sinhvien_trong_lop_hoc_phan` (
`LopHocPhanID` int(11)
,`MaLopHP` varchar(50)
,`TenMon` varchar(100)
,`TenHocKy` varchar(50)
,`GiangVienPhuTrach` varchar(100)
,`SinhVienID` int(11)
,`MaSV` varchar(20)
,`HoTenSinhVien` varchar(100)
,`Email` varchar(255)
,`SoDienThoai` varchar(10)
,`ThoiGianDangKy` datetime
,`TrangThai` varchar(50)
);

-- --------------------------------------------------------

--
-- Structure for view `v_bangdiem_lop_hoc_phan`
--
DROP TABLE IF EXISTS `v_bangdiem_lop_hoc_phan`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_bangdiem_lop_hoc_phan`  AS SELECT `lh`.`LopHocPhanID` AS `LopHocPhanID`, `lh`.`MaLopHP` AS `MaLopHP`, `mh`.`TenMon` AS `TenMon`, `h`.`TenHocKy` AS `TenHocKy`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `ds`.`DiemChuyenCan` AS `DiemChuyenCan`, `ds`.`DiemGiuaKy` AS `DiemGiuaKy`, `ds`.`DiemThi` AS `DiemThi`, `ds`.`DiemTongKet` AS `DiemTongKet`, CASE WHEN `ds`.`DiemTongKet` >= 8.0 THEN 'A' WHEN `ds`.`DiemTongKet` >= 7.0 THEN 'B+' WHEN `ds`.`DiemTongKet` >= 6.5 THEN 'B' WHEN `ds`.`DiemTongKet` >= 5.5 THEN 'C+' WHEN `ds`.`DiemTongKet` >= 5.0 THEN 'C' WHEN `ds`.`DiemTongKet` >= 4.0 THEN 'D' ELSE 'F' END AS `DiemChu` FROM (((((`lophocphan` `lh` join `monhoc` `mh` on(`lh`.`MonHocID` = `mh`.`MonHocID`)) join `hocky` `h` on(`lh`.`HocKyID` = `h`.`HocKyID`)) join `dangkyhocphan` `dk` on(`lh`.`LopHocPhanID` = `dk`.`LopHocPhanID`)) join `sinhvien` `sv` on(`dk`.`SinhVienID` = `sv`.`SinhVienID`)) left join `diemso` `ds` on(`dk`.`DangKyID` = `ds`.`DangKyID`)) WHERE `dk`.`TrangThai` = 'ThanhCong' ORDER BY `lh`.`MaLopHP` ASC, `sv`.`MaSV` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_cong_no_hoc_phi_sinhvien`
--
DROP TABLE IF EXISTS `v_cong_no_hoc_phi_sinhvien`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_cong_no_hoc_phi_sinhvien`  AS SELECT `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `h`.`TenHocKy` AS `TenHocKy`, `hp`.`HocPhiID` AS `HocPhiID`, `hp`.`TongTien` AS `TongTien`, `hp`.`DaNop` AS `DaNop`, `hp`.`TongTien`- `hp`.`DaNop` AS `ConNo`, `hp`.`HanNop` AS `HanNop`, CASE WHEN `hp`.`TongTien` - `hp`.`DaNop` <= 0 THEN 'DaHoanThanh' WHEN `hp`.`HanNop` < curdate() THEN 'QuaHan' ELSE 'ChuaHoanThanh' END AS `TrangThaiNo`, coalesce((select sum(`tt`.`SoTien`) from `thanhtoanhocphi` `tt` where `tt`.`HocPhiID` = `hp`.`HocPhiID`),0) AS `TongDaThanhToanChiTiet` FROM ((`sinhvien` `sv` join `hocphi` `hp` on(`sv`.`SinhVienID` = `hp`.`SinhVienID`)) join `hocky` `h` on(`hp`.`HocKyID` = `h`.`HocKyID`)) ORDER BY `sv`.`MaSV` ASC, `hp`.`HanNop` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `v_dangkyhocphan_hien_tai`
--
DROP TABLE IF EXISTS `v_dangkyhocphan_hien_tai`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_dangkyhocphan_hien_tai`  AS SELECT `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `dk`.`DangKyID` AS `DangKyID`, `dk`.`ThoiGianDangKy` AS `ThoiGianDangKy`, `lh`.`MaLopHP` AS `MaLopHP`, `mh`.`MaMon` AS `MaMon`, `mh`.`TenMon` AS `TenMon`, `mh`.`SoTinChi` AS `SoTinChi`, `gv`.`HoTen` AS `TenGiangVien`, `h`.`TenHocKy` AS `TenHocKy` FROM (((((`sinhvien` `sv` join `dangkyhocphan` `dk` on(`sv`.`SinhVienID` = `dk`.`SinhVienID`)) join `lophocphan` `lh` on(`dk`.`LopHocPhanID` = `lh`.`LopHocPhanID`)) join `monhoc` `mh` on(`lh`.`MonHocID` = `mh`.`MonHocID`)) left join `giangvien` `gv` on(`lh`.`GiangVienID` = `gv`.`GiangVienID`)) join `hocky` `h` on(`lh`.`HocKyID` = `h`.`HocKyID`)) WHERE `dk`.`TrangThai` = 'ThanhCong' AND `h`.`HocKyID` = (select max(`hocky`.`HocKyID`) from `hocky`) ;

-- --------------------------------------------------------

--
-- Structure for view `v_danhsach_lop_giangvien`
--
DROP TABLE IF EXISTS `v_danhsach_lop_giangvien`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_danhsach_lop_giangvien`  AS SELECT `gv`.`GiangVienID` AS `GiangVienID`, `gv`.`HoTen` AS `TenGiangVien`, `gv`.`HocVi` AS `HocVi`, `gv`.`ChuyenMon` AS `ChuyenMon`, `gv`.`KhoaID` AS `KhoaID`, `gv`.`email` AS `email`, `gv`.`sodienthoai` AS `sodienthoai`, `lhp`.`LopHocPhanID` AS `LopHocPhanID`, `lhp`.`MaLopHP` AS `MaLopHP`, `mh`.`MaMon` AS `MaMon`, `mh`.`TenMon` AS `TenMon`, `mh`.`SoTinChi` AS `SoTinChi`, `nh`.`TenNamHoc` AS `NamHoc`, `hk`.`TenHocKy` AS `TenHocKy`, `hk`.`LoaiHocKy` AS `LoaiHocKy`, `lhp`.`SoLuongToiDa` AS `SoLuongToiDa`, coalesce(count(`dkhp`.`DangKyID`),0) AS `SoSinhVien` FROM (((((`giangvien` `gv` join `lophocphan` `lhp` on(`gv`.`GiangVienID` = `lhp`.`GiangVienID`)) left join `monhoc` `mh` on(`lhp`.`MonHocID` = `mh`.`MonHocID`)) join `hocky` `hk` on(`lhp`.`HocKyID` = `hk`.`HocKyID`)) join `namhoc` `nh` on(`hk`.`NamHocID` = `nh`.`NamHocID`)) left join `dangkyhocphan` `dkhp` on(`lhp`.`LopHocPhanID` = `dkhp`.`LopHocPhanID`)) GROUP BY `gv`.`GiangVienID`, `gv`.`HoTen`, `gv`.`HocVi`, `gv`.`ChuyenMon`, `gv`.`KhoaID`, `gv`.`email`, `gv`.`sodienthoai`, `lhp`.`LopHocPhanID`, `lhp`.`MaLopHP`, `mh`.`MaMon`, `mh`.`TenMon`, `mh`.`SoTinChi`, `nh`.`TenNamHoc`, `hk`.`TenHocKy`, `hk`.`LoaiHocKy`, `lhp`.`SoLuongToiDa` ;

-- --------------------------------------------------------

--
-- Structure for view `v_diemrenluyen_sinhvien`
--
DROP TABLE IF EXISTS `v_diemrenluyen_sinhvien`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_diemrenluyen_sinhvien`  AS SELECT `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `drl`.`HocKyID` AS `HocKyID`, `h`.`TenHocKy` AS `TenHocKy`, `drl`.`TongDiem` AS `TongDiem`, `drl`.`XepLoai` AS `XepLoai`, `drl`.`NgayDanhGia` AS `NgayDanhGia` FROM ((`sinhvien` `sv` join `diemrenluyen` `drl` on(`sv`.`SinhVienID` = `drl`.`SinhVienID`)) join `hocky` `h` on(`drl`.`HocKyID` = `h`.`HocKyID`)) ORDER BY `sv`.`SinhVienID` ASC, `drl`.`HocKyID` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `v_diem_hoc_ky_sinhvien`
--
DROP TABLE IF EXISTS `v_diem_hoc_ky_sinhvien`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_diem_hoc_ky_sinhvien`  AS SELECT `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `hk`.`HocKyID` AS `HocKyID`, `hk`.`TenHocKy` AS `TenHocKy`, `nh`.`NamHocID` AS `NamHocID`, `mh`.`MaMon` AS `MaMon`, `mh`.`TenMon` AS `TenMon`, `mh`.`SoTinChi` AS `SoTinChi`, `ds`.`DiemChuyenCan` AS `DiemChuyenCan`, `ds`.`DiemGiuaKy` AS `DiemGiuaKy`, `ds`.`DiemThi` AS `DiemThi`, `ds`.`DiemTongKet` AS `DiemTongKet`, `dkhp`.`ThoiGianDangKy` AS `ThoiGianDangKy` FROM ((((((`sinhvien` `sv` join `dangkyhocphan` `dkhp` on(`sv`.`SinhVienID` = `dkhp`.`SinhVienID`)) join `lophocphan` `lhp` on(`dkhp`.`LopHocPhanID` = `lhp`.`LopHocPhanID`)) join `hocky` `hk` on(`lhp`.`HocKyID` = `hk`.`HocKyID`)) join `namhoc` `nh` on(`hk`.`NamHocID` = `nh`.`NamHocID`)) join `monhoc` `mh` on(`lhp`.`MonHocID` = `mh`.`MonHocID`)) left join `diemso` `ds` on(`dkhp`.`DangKyID` = `ds`.`DangKyID`)) ORDER BY `sv`.`SinhVienID` ASC, `hk`.`HocKyID` ASC, `mh`.`MaMon` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_dot_dangky_hien_tai`
--
DROP TABLE IF EXISTS `v_dot_dangky_hien_tai`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_dot_dangky_hien_tai`  AS SELECT `dd`.`DotDangKyID` AS `DotDangKyID`, `dd`.`TenDot` AS `TenDot`, `h`.`TenHocKy` AS `TenHocKy`, `h`.`LoaiHocKy` AS `LoaiHocKy`, `dd`.`NgayBatDau` AS `NgayBatDau`, `dd`.`NgayKetThuc` AS `NgayKetThuc`, `dd`.`TrangThai` AS `TrangThai`, `dd`.`DoiTuong` AS `DoiTuong`, `dd`.`GhiChu` AS `GhiChu`, current_timestamp() AS `ThoiGianHienTai`, CASE WHEN current_timestamp() between `dd`.`NgayBatDau` and `dd`.`NgayKetThuc` THEN 'DangMo' WHEN current_timestamp() < `dd`.`NgayBatDau` THEN 'ChuaMo' ELSE 'DaDong' END AS `TrangThaiThucTe` FROM (`dotdangky` `dd` join `hocky` `h` on(`dd`.`HocKyID` = `h`.`HocKyID`)) WHERE `dd`.`TrangThai` = 'Mo' AND current_timestamp() <= `dd`.`NgayKetThuc` ORDER BY `dd`.`NgayBatDau` DESC LIMIT 0, 3 ;

-- --------------------------------------------------------

--
-- Structure for view `v_gpa_hoc_ky`
--
DROP TABLE IF EXISTS `v_gpa_hoc_ky`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_gpa_hoc_ky`  AS SELECT `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `hk`.`HocKyID` AS `HocKyID`, `hk`.`TenHocKy` AS `TenHocKy`, `nh`.`NamHocID` AS `NamHocID`, count(distinct `mh`.`MonHocID`) AS `SoMon`, sum(`mh`.`SoTinChi`) AS `TongTinChi`, round(avg(`ds`.`DiemTongKet`),2) AS `GPA_HocKy_TamTinh` FROM ((((((`sinhvien` `sv` join `dangkyhocphan` `dkhp` on(`sv`.`SinhVienID` = `dkhp`.`SinhVienID`)) join `lophocphan` `lhp` on(`dkhp`.`LopHocPhanID` = `lhp`.`LopHocPhanID`)) join `hocky` `hk` on(`lhp`.`HocKyID` = `hk`.`HocKyID`)) left join `namhoc` `nh` on(`hk`.`NamHocID` = `nh`.`NamHocID`)) join `monhoc` `mh` on(`lhp`.`MonHocID` = `mh`.`MonHocID`)) left join `diemso` `ds` on(`dkhp`.`DangKyID` = `ds`.`DangKyID`)) GROUP BY `sv`.`SinhVienID`, `sv`.`MaSV`, `sv`.`HoTen`, `hk`.`HocKyID`, `hk`.`TenHocKy`, `nh`.`NamHocID` ;

-- --------------------------------------------------------

--
-- Structure for view `v_lich_hoc_sinhvien`
--
DROP TABLE IF EXISTS `v_lich_hoc_sinhvien`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_lich_hoc_sinhvien`  AS SELECT `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `lh`.`LichHocID` AS `LichHocID`, `lh`.`LopHocPhanID` AS `LopHocPhanID`, `lh`.`NgayHoc` AS `NgayHoc`, `lh`.`BuoiHoc` AS `BuoiHoc`, `lh`.`TietBatDau` AS `TietBatDau`, `lh`.`SoTiet` AS `SoTiet`, `lh`.`PhongHoc` AS `PhongHoc`, `lh`.`GhiChu` AS `GhiChu`, `mh`.`TenMon` AS `TenMon`, `lhp`.`MaLopHP` AS `MaLopHP`, `gv`.`HoTen` AS `TenGiangVien`, `hk`.`HocKyID` AS `HocKyID`, `hk`.`TenHocKy` AS `TenHocKy`, `nh`.`NamHocID` AS `NamHocID`, `nh`.`TenNamHoc` AS `TenNamHoc`, `lhp`.`NgayBatDau` AS `NgayBatDauLop`, `lhp`.`NgayKetThuc` AS `NgayKetThucLop`, `hk`.`NgayBatDau` AS `NgayBatDauHocKy`, `hk`.`NgayKetThuc` AS `NgayKetThucHocKy` FROM (((((((`sinhvien` `sv` join `dangkyhocphan` `dk` on(`sv`.`SinhVienID` = `dk`.`SinhVienID`)) join `lichhoc` `lh` on(`dk`.`LopHocPhanID` = `lh`.`LopHocPhanID`)) join `lophocphan` `lhp` on(`lh`.`LopHocPhanID` = `lhp`.`LopHocPhanID`)) join `monhoc` `mh` on(`lhp`.`MonHocID` = `mh`.`MonHocID`)) left join `giangvien` `gv` on(`lhp`.`GiangVienID` = `gv`.`GiangVienID`)) join `hocky` `hk` on(`lhp`.`HocKyID` = `hk`.`HocKyID`)) join `namhoc` `nh` on(`hk`.`NamHocID` = `nh`.`NamHocID`)) ;

-- --------------------------------------------------------

--
-- Structure for view `v_lich_thi_sinhvien`
--
DROP TABLE IF EXISTS `v_lich_thi_sinhvien`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_lich_thi_sinhvien`  AS SELECT `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `lt`.`LichThiID` AS `LichThiID`, `lt`.`LopHocPhanID` AS `LopHocPhanID`, `lt`.`NgayThi` AS `NgayThi`, `lt`.`GioBatDau` AS `GioBatDau`, `lt`.`GioKetThuc` AS `GioKetThuc`, `lt`.`PhongThi` AS `PhongThi`, `lt`.`HinhThucThi` AS `HinhThucThi`, `lt`.`GhiChu` AS `GhiChu`, `mh`.`TenMon` AS `TenMon`, `lhp`.`MaLopHP` AS `MaLopHP`, `gv`.`HoTen` AS `TenGiangVien`, `hk`.`HocKyID` AS `HocKyID`, `hk`.`TenHocKy` AS `TenHocKy`, `nh`.`NamHocID` AS `NamHocID`, `nh`.`TenNamHoc` AS `TenNamHoc`, `lhp`.`NgayBatDau` AS `NgayBatDauLop`, `lhp`.`NgayKetThuc` AS `NgayKetThucLop`, `hk`.`NgayBatDau` AS `NgayBatDauHocKy`, `hk`.`NgayKetThuc` AS `NgayKetThucHocKy` FROM (((((((`sinhvien` `sv` join `dangkyhocphan` `dk` on(`sv`.`SinhVienID` = `dk`.`SinhVienID`)) join `lichthi` `lt` on(`dk`.`LopHocPhanID` = `lt`.`LopHocPhanID`)) join `lophocphan` `lhp` on(`lt`.`LopHocPhanID` = `lhp`.`LopHocPhanID`)) join `monhoc` `mh` on(`lhp`.`MonHocID` = `mh`.`MonHocID`)) left join `giangvien` `gv` on(`lhp`.`GiangVienID` = `gv`.`GiangVienID`)) join `hocky` `hk` on(`lhp`.`HocKyID` = `hk`.`HocKyID`)) join `namhoc` `nh` on(`hk`.`NamHocID` = `nh`.`NamHocID`)) ;

-- --------------------------------------------------------

--
-- Structure for view `v_lophocphan_mo_dangky`
--
DROP TABLE IF EXISTS `v_lophocphan_mo_dangky`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_lophocphan_mo_dangky`  AS SELECT `lh`.`LopHocPhanID` AS `LopHocPhanID`, `lh`.`MaLopHP` AS `MaLopHP`, `mh`.`MaMon` AS `MaMon`, `mh`.`TenMon` AS `TenMon`, `mh`.`SoTinChi` AS `SoTinChi`, `gv`.`HoTen` AS `TenGiangVien`, `h`.`TenHocKy` AS `TenHocKy`, `dd`.`TenDot` AS `TenDot`, `dd`.`NgayBatDau` AS `NgayBatDau`, `dd`.`NgayKetThuc` AS `NgayKetThuc`, `dd`.`TrangThai` AS `TrangThaiDot`, `lh`.`SoLuongToiDa` AS `SoLuongToiDa`, (select count(0) from `dangkyhocphan` `dk` where `dk`.`LopHocPhanID` = `lh`.`LopHocPhanID` and `dk`.`TrangThai` = 'ThanhCong') AS `SoLuongDaDangKy` FROM ((((`lophocphan` `lh` join `monhoc` `mh` on(`lh`.`MonHocID` = `mh`.`MonHocID`)) join `hocky` `h` on(`lh`.`HocKyID` = `h`.`HocKyID`)) left join `giangvien` `gv` on(`lh`.`GiangVienID` = `gv`.`GiangVienID`)) join `dotdangky` `dd` on(`h`.`HocKyID` = `dd`.`HocKyID`)) WHERE `dd`.`TrangThai` = 'Mo' AND current_timestamp() between `dd`.`NgayBatDau` and `dd`.`NgayKetThuc` ORDER BY `dd`.`NgayBatDau` DESC, `lh`.`MaLopHP` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_sinhvien_chuongtrinhdaotao`
--
DROP TABLE IF EXISTS `v_sinhvien_chuongtrinhdaotao`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_sinhvien_chuongtrinhdaotao`  AS SELECT `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `n`.`MaNganh` AS `MaNganh`, `n`.`TenNganh` AS `TenNganh`, `mh`.`MaMon` AS `MaMon`, `mh`.`TenMon` AS `TenMon`, `mh`.`SoTinChi` AS `SoTinChi`, `ctdt`.`HocKyGoiY` AS `HocKyGoiY`, `ctdt`.`BatBuoc` AS `BatBuoc`, `mh`.`KhoaID` AS `KhoaID` FROM (((`sinhvien` `sv` join `nganhdaotao` `n` on(`sv`.`NganhID` = `n`.`NganhID`)) join `chuongtrinhdaotao` `ctdt` on(`n`.`NganhID` = `ctdt`.`NganhID`)) join `monhoc` `mh` on(`ctdt`.`MonHocID` = `mh`.`MonHocID`)) ORDER BY `sv`.`SinhVienID` ASC, `ctdt`.`HocKyGoiY` ASC, `mh`.`MaMon` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_sinhvien_lop_sinh_hoat`
--
DROP TABLE IF EXISTS `v_sinhvien_lop_sinh_hoat`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_sinhvien_lop_sinh_hoat`  AS SELECT `lsh`.`LopSinhHoatID` AS `LopSinhHoatID`, `lsh`.`MaLop` AS `MaLop`, `lsh`.`TenLop` AS `TenLop`, `lsh`.`NamNhapHoc` AS `NamNhapHoc`, `k`.`TenKhoa` AS `TenKhoa`, `gv`.`HoTen` AS `TenCoVan`, `gv`.`email` AS `EmailCoVan`, `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTen`, `sv`.`NgaySinh` AS `NgaySinh`, `sv`.`email` AS `Email`, `sv`.`sodienthoai` AS `SoDienThoai` FROM (((`lopsinhhoat` `lsh` join `khoa` `k` on(`lsh`.`KhoaID` = `k`.`KhoaID`)) left join `giangvien` `gv` on(`lsh`.`GiangVienID` = `gv`.`GiangVienID`)) left join `sinhvien` `sv` on(`lsh`.`LopSinhHoatID` = `sv`.`LopSinhHoatID`)) ORDER BY `lsh`.`MaLop` ASC, `sv`.`MaSV` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_sinhvien_trong_lop_hoc_phan`
--
DROP TABLE IF EXISTS `v_sinhvien_trong_lop_hoc_phan`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_sinhvien_trong_lop_hoc_phan`  AS SELECT `lh`.`LopHocPhanID` AS `LopHocPhanID`, `lh`.`MaLopHP` AS `MaLopHP`, `mh`.`TenMon` AS `TenMon`, `h`.`TenHocKy` AS `TenHocKy`, `gv`.`HoTen` AS `GiangVienPhuTrach`, `sv`.`SinhVienID` AS `SinhVienID`, `sv`.`MaSV` AS `MaSV`, `sv`.`HoTen` AS `HoTenSinhVien`, `sv`.`email` AS `Email`, `sv`.`sodienthoai` AS `SoDienThoai`, `dk`.`ThoiGianDangKy` AS `ThoiGianDangKy`, `dk`.`TrangThai` AS `TrangThai` FROM (((((`lophocphan` `lh` join `monhoc` `mh` on(`lh`.`MonHocID` = `mh`.`MonHocID`)) join `hocky` `h` on(`lh`.`HocKyID` = `h`.`HocKyID`)) left join `giangvien` `gv` on(`lh`.`GiangVienID` = `gv`.`GiangVienID`)) join `dangkyhocphan` `dk` on(`lh`.`LopHocPhanID` = `dk`.`LopHocPhanID`)) join `sinhvien` `sv` on(`dk`.`SinhVienID` = `sv`.`SinhVienID`)) WHERE `dk`.`TrangThai` = 'ThanhCong' ORDER BY `lh`.`MaLopHP` ASC, `sv`.`MaSV` ASC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`AdminID`),
  ADD UNIQUE KEY `UserID` (`UserID`),
  ADD UNIQUE KEY `Email` (`Email`),
  ADD UNIQUE KEY `SoDienThoai` (`SoDienThoai`);

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `chitietdiemrenluyen`
--
ALTER TABLE `chitietdiemrenluyen`
  ADD PRIMARY KEY (`ID`),
  ADD UNIQUE KEY `DiemRenLuyenID` (`DiemRenLuyenID`,`TieuChiID`),
  ADD KEY `TieuChiID` (`TieuChiID`);

--
-- Indexes for table `chuongtrinhdaotao`
--
ALTER TABLE `chuongtrinhdaotao`
  ADD PRIMARY KEY (`ID`),
  ADD UNIQUE KEY `NganhID` (`NganhID`,`MonHocID`),
  ADD KEY `MonHocID` (`MonHocID`);

--
-- Indexes for table `dangkyhocphan`
--
ALTER TABLE `dangkyhocphan`
  ADD PRIMARY KEY (`DangKyID`),
  ADD UNIQUE KEY `SinhVienID` (`SinhVienID`,`LopHocPhanID`),
  ADD KEY `LopHocPhanID` (`LopHocPhanID`);

--
-- Indexes for table `diemrenluyen`
--
ALTER TABLE `diemrenluyen`
  ADD PRIMARY KEY (`DiemRenLuyenID`),
  ADD UNIQUE KEY `SinhVienID` (`SinhVienID`,`HocKyID`),
  ADD KEY `HocKyID` (`HocKyID`);

--
-- Indexes for table `diemso`
--
ALTER TABLE `diemso`
  ADD PRIMARY KEY (`DiemID`),
  ADD UNIQUE KEY `DangKyID` (`DangKyID`);

--
-- Indexes for table `dieukienmonhoc`
--
ALTER TABLE `dieukienmonhoc`
  ADD PRIMARY KEY (`DieuKienID`),
  ADD KEY `MonHocID` (`MonHocID`),
  ADD KEY `MonTienQuyetID` (`MonTienQuyetID`);

--
-- Indexes for table `dotdangky`
--
ALTER TABLE `dotdangky`
  ADD PRIMARY KEY (`DotDangKyID`),
  ADD KEY `HocKyID` (`HocKyID`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `giangvien`
--
ALTER TABLE `giangvien`
  ADD PRIMARY KEY (`GiangVienID`),
  ADD UNIQUE KEY `UserID` (`UserID`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `sodienthoai` (`sodienthoai`),
  ADD KEY `KhoaID` (`KhoaID`);

--
-- Indexes for table `hethong_log`
--
ALTER TABLE `hethong_log`
  ADD PRIMARY KEY (`LogID`),
  ADD KEY `idx_user_hanhdong` (`UserID`,`HanhDong`,`created_at`);

--
-- Indexes for table `hocky`
--
ALTER TABLE `hocky`
  ADD PRIMARY KEY (`HocKyID`),
  ADD KEY `NamHocID` (`NamHocID`);

--
-- Indexes for table `hocphi`
--
ALTER TABLE `hocphi`
  ADD PRIMARY KEY (`HocPhiID`),
  ADD KEY `SinhVienID` (`SinhVienID`),
  ADD KEY `HocKyID` (`HocKyID`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indexes for table `khoa`
--
ALTER TABLE `khoa`
  ADD PRIMARY KEY (`KhoaID`),
  ADD UNIQUE KEY `MaKhoa` (`MaKhoa`);

--
-- Indexes for table `lichhoc`
--
ALTER TABLE `lichhoc`
  ADD PRIMARY KEY (`LichHocID`),
  ADD KEY `LopHocPhanID` (`LopHocPhanID`),
  ADD KEY `idx_ngay_buoi` (`NgayHoc`,`BuoiHoc`);

--
-- Indexes for table `lichthi`
--
ALTER TABLE `lichthi`
  ADD PRIMARY KEY (`LichThiID`),
  ADD KEY `LopHocPhanID` (`LopHocPhanID`);

--
-- Indexes for table `lophocphan`
--
ALTER TABLE `lophocphan`
  ADD PRIMARY KEY (`LopHocPhanID`),
  ADD UNIQUE KEY `MaLopHP` (`MaLopHP`),
  ADD KEY `MonHocID` (`MonHocID`),
  ADD KEY `HocKyID` (`HocKyID`),
  ADD KEY `GiangVienID` (`GiangVienID`);

--
-- Indexes for table `lopsinhhoat`
--
ALTER TABLE `lopsinhhoat`
  ADD PRIMARY KEY (`LopSinhHoatID`),
  ADD UNIQUE KEY `MaLop` (`MaLop`),
  ADD KEY `KhoaID` (`KhoaID`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `monhoc`
--
ALTER TABLE `monhoc`
  ADD PRIMARY KEY (`MonHocID`),
  ADD UNIQUE KEY `MaMon` (`MaMon`),
  ADD KEY `KhoaID` (`KhoaID`);

--
-- Indexes for table `monhoc_songhanh`
--
ALTER TABLE `monhoc_songhanh`
  ADD PRIMARY KEY (`ID`),
  ADD UNIQUE KEY `unique_pair` (`MonHocID`,`MonSongHanhID`),
  ADD KEY `MonSongHanhID` (`MonSongHanhID`);

--
-- Indexes for table `namhoc`
--
ALTER TABLE `namhoc`
  ADD PRIMARY KEY (`NamHocID`);

--
-- Indexes for table `nganhdaotao`
--
ALTER TABLE `nganhdaotao`
  ADD PRIMARY KEY (`NganhID`),
  ADD UNIQUE KEY `MaNganh` (`MaNganh`),
  ADD KEY `KhoaID` (`KhoaID`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`RoleID`),
  ADD UNIQUE KEY `RoleName` (`RoleName`);

--
-- Indexes for table `sinhvien`
--
ALTER TABLE `sinhvien`
  ADD PRIMARY KEY (`SinhVienID`),
  ADD UNIQUE KEY `UserID` (`UserID`),
  ADD UNIQUE KEY `MaSV` (`MaSV`),
  ADD KEY `KhoaID` (`KhoaID`),
  ADD KEY `NganhID` (`NganhID`),
  ADD KEY `LopSinhHoatID` (`LopSinhHoatID`),
  ADD KEY `idx_khoahoc` (`khoahoc`);

--
-- Indexes for table `thanhtoanhocphi`
--
ALTER TABLE `thanhtoanhocphi`
  ADD PRIMARY KEY (`ThanhToanID`),
  ADD KEY `HocPhiID` (`HocPhiID`);

--
-- Indexes for table `thongbao`
--
ALTER TABLE `thongbao`
  ADD PRIMARY KEY (`ThongBaoID`),
  ADD KEY `NguoiGuiID` (`NguoiGuiID`);

--
-- Indexes for table `tieuchirenluyen`
--
ALTER TABLE `tieuchirenluyen`
  ADD PRIMARY KEY (`TieuChiID`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `Username` (`Username`),
  ADD UNIQUE KEY `Email` (`Email`),
  ADD KEY `RoleID` (`RoleID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `AdminID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `chitietdiemrenluyen`
--
ALTER TABLE `chitietdiemrenluyen`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `chuongtrinhdaotao`
--
ALTER TABLE `chuongtrinhdaotao`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `dangkyhocphan`
--
ALTER TABLE `dangkyhocphan`
  MODIFY `DangKyID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `diemrenluyen`
--
ALTER TABLE `diemrenluyen`
  MODIFY `DiemRenLuyenID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `diemso`
--
ALTER TABLE `diemso`
  MODIFY `DiemID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `dieukienmonhoc`
--
ALTER TABLE `dieukienmonhoc`
  MODIFY `DieuKienID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `dotdangky`
--
ALTER TABLE `dotdangky`
  MODIFY `DotDangKyID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `giangvien`
--
ALTER TABLE `giangvien`
  MODIFY `GiangVienID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `hethong_log`
--
ALTER TABLE `hethong_log`
  MODIFY `LogID` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `hocky`
--
ALTER TABLE `hocky`
  MODIFY `HocKyID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `hocphi`
--
ALTER TABLE `hocphi`
  MODIFY `HocPhiID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `khoa`
--
ALTER TABLE `khoa`
  MODIFY `KhoaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `lichhoc`
--
ALTER TABLE `lichhoc`
  MODIFY `LichHocID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `lichthi`
--
ALTER TABLE `lichthi`
  MODIFY `LichThiID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `lophocphan`
--
ALTER TABLE `lophocphan`
  MODIFY `LopHocPhanID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `lopsinhhoat`
--
ALTER TABLE `lopsinhhoat`
  MODIFY `LopSinhHoatID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `monhoc`
--
ALTER TABLE `monhoc`
  MODIFY `MonHocID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `monhoc_songhanh`
--
ALTER TABLE `monhoc_songhanh`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `namhoc`
--
ALTER TABLE `namhoc`
  MODIFY `NamHocID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `nganhdaotao`
--
ALTER TABLE `nganhdaotao`
  MODIFY `NganhID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `RoleID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `sinhvien`
--
ALTER TABLE `sinhvien`
  MODIFY `SinhVienID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `thanhtoanhocphi`
--
ALTER TABLE `thanhtoanhocphi`
  MODIFY `ThanhToanID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `thongbao`
--
ALTER TABLE `thongbao`
  MODIFY `ThongBaoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tieuchirenluyen`
--
ALTER TABLE `tieuchirenluyen`
  MODIFY `TieuChiID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin`
--
ALTER TABLE `admin`
  ADD CONSTRAINT `admin_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `chitietdiemrenluyen`
--
ALTER TABLE `chitietdiemrenluyen`
  ADD CONSTRAINT `chitietdiemrenluyen_ibfk_1` FOREIGN KEY (`DiemRenLuyenID`) REFERENCES `diemrenluyen` (`DiemRenLuyenID`) ON DELETE CASCADE,
  ADD CONSTRAINT `chitietdiemrenluyen_ibfk_2` FOREIGN KEY (`TieuChiID`) REFERENCES `tieuchirenluyen` (`TieuChiID`) ON DELETE CASCADE;

--
-- Constraints for table `chuongtrinhdaotao`
--
ALTER TABLE `chuongtrinhdaotao`
  ADD CONSTRAINT `chuongtrinhdaotao_ibfk_1` FOREIGN KEY (`NganhID`) REFERENCES `nganhdaotao` (`NganhID`) ON DELETE CASCADE,
  ADD CONSTRAINT `chuongtrinhdaotao_ibfk_2` FOREIGN KEY (`MonHocID`) REFERENCES `monhoc` (`MonHocID`) ON DELETE CASCADE;

--
-- Constraints for table `dangkyhocphan`
--
ALTER TABLE `dangkyhocphan`
  ADD CONSTRAINT `dangkyhocphan_ibfk_1` FOREIGN KEY (`SinhVienID`) REFERENCES `sinhvien` (`SinhVienID`),
  ADD CONSTRAINT `dangkyhocphan_ibfk_2` FOREIGN KEY (`LopHocPhanID`) REFERENCES `lophocphan` (`LopHocPhanID`);

--
-- Constraints for table `diemrenluyen`
--
ALTER TABLE `diemrenluyen`
  ADD CONSTRAINT `diemrenluyen_ibfk_1` FOREIGN KEY (`SinhVienID`) REFERENCES `sinhvien` (`SinhVienID`) ON DELETE CASCADE,
  ADD CONSTRAINT `diemrenluyen_ibfk_2` FOREIGN KEY (`HocKyID`) REFERENCES `hocky` (`HocKyID`) ON DELETE CASCADE;

--
-- Constraints for table `diemso`
--
ALTER TABLE `diemso`
  ADD CONSTRAINT `diemso_ibfk_1` FOREIGN KEY (`DangKyID`) REFERENCES `dangkyhocphan` (`DangKyID`) ON DELETE CASCADE;

--
-- Constraints for table `dieukienmonhoc`
--
ALTER TABLE `dieukienmonhoc`
  ADD CONSTRAINT `dieukienmonhoc_ibfk_1` FOREIGN KEY (`MonHocID`) REFERENCES `monhoc` (`MonHocID`) ON DELETE CASCADE,
  ADD CONSTRAINT `dieukienmonhoc_ibfk_2` FOREIGN KEY (`MonTienQuyetID`) REFERENCES `monhoc` (`MonHocID`) ON DELETE CASCADE;

--
-- Constraints for table `dotdangky`
--
ALTER TABLE `dotdangky`
  ADD CONSTRAINT `dotdangky_ibfk_1` FOREIGN KEY (`HocKyID`) REFERENCES `hocky` (`HocKyID`) ON DELETE CASCADE;

--
-- Constraints for table `giangvien`
--
ALTER TABLE `giangvien`
  ADD CONSTRAINT `giangvien_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `giangvien_ibfk_2` FOREIGN KEY (`KhoaID`) REFERENCES `khoa` (`KhoaID`) ON UPDATE CASCADE;

--
-- Constraints for table `hocky`
--
ALTER TABLE `hocky`
  ADD CONSTRAINT `hocky_ibfk_1` FOREIGN KEY (`NamHocID`) REFERENCES `namhoc` (`NamHocID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `hocphi`
--
ALTER TABLE `hocphi`
  ADD CONSTRAINT `hocphi_ibfk_1` FOREIGN KEY (`SinhVienID`) REFERENCES `sinhvien` (`SinhVienID`),
  ADD CONSTRAINT `hocphi_ibfk_2` FOREIGN KEY (`HocKyID`) REFERENCES `hocky` (`HocKyID`);

--
-- Constraints for table `lichhoc`
--
ALTER TABLE `lichhoc`
  ADD CONSTRAINT `lichhoc_ibfk_1` FOREIGN KEY (`LopHocPhanID`) REFERENCES `lophocphan` (`LopHocPhanID`) ON DELETE CASCADE;

--
-- Constraints for table `lichthi`
--
ALTER TABLE `lichthi`
  ADD CONSTRAINT `lichthi_ibfk_1` FOREIGN KEY (`LopHocPhanID`) REFERENCES `lophocphan` (`LopHocPhanID`) ON DELETE CASCADE;

--
-- Constraints for table `lophocphan`
--
ALTER TABLE `lophocphan`
  ADD CONSTRAINT `lophocphan_ibfk_1` FOREIGN KEY (`MonHocID`) REFERENCES `monhoc` (`MonHocID`),
  ADD CONSTRAINT `lophocphan_ibfk_2` FOREIGN KEY (`HocKyID`) REFERENCES `hocky` (`HocKyID`),
  ADD CONSTRAINT `lophocphan_ibfk_3` FOREIGN KEY (`GiangVienID`) REFERENCES `giangvien` (`GiangVienID`);

--
-- Constraints for table `lopsinhhoat`
--
ALTER TABLE `lopsinhhoat`
  ADD CONSTRAINT `lopsinhhoat_ibfk_1` FOREIGN KEY (`KhoaID`) REFERENCES `khoa` (`KhoaID`);

--
-- Constraints for table `monhoc`
--
ALTER TABLE `monhoc`
  ADD CONSTRAINT `monhoc_ibfk_1` FOREIGN KEY (`KhoaID`) REFERENCES `khoa` (`KhoaID`) ON UPDATE CASCADE;

--
-- Constraints for table `monhoc_songhanh`
--
ALTER TABLE `monhoc_songhanh`
  ADD CONSTRAINT `monhoc_songhanh_ibfk_1` FOREIGN KEY (`MonHocID`) REFERENCES `monhoc` (`MonHocID`) ON DELETE CASCADE,
  ADD CONSTRAINT `monhoc_songhanh_ibfk_2` FOREIGN KEY (`MonSongHanhID`) REFERENCES `monhoc` (`MonHocID`) ON DELETE CASCADE;

--
-- Constraints for table `nganhdaotao`
--
ALTER TABLE `nganhdaotao`
  ADD CONSTRAINT `nganhdaotao_ibfk_1` FOREIGN KEY (`KhoaID`) REFERENCES `khoa` (`KhoaID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `sinhvien`
--
ALTER TABLE `sinhvien`
  ADD CONSTRAINT `sinhvien_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `sinhvien_ibfk_2` FOREIGN KEY (`KhoaID`) REFERENCES `khoa` (`KhoaID`),
  ADD CONSTRAINT `sinhvien_ibfk_3` FOREIGN KEY (`NganhID`) REFERENCES `nganhdaotao` (`NganhID`),
  ADD CONSTRAINT `sinhvien_ibfk_4` FOREIGN KEY (`LopSinhHoatID`) REFERENCES `lopsinhhoat` (`LopSinhHoatID`) ON DELETE SET NULL;

--
-- Constraints for table `thanhtoanhocphi`
--
ALTER TABLE `thanhtoanhocphi`
  ADD CONSTRAINT `thanhtoanhocphi_ibfk_1` FOREIGN KEY (`HocPhiID`) REFERENCES `hocphi` (`HocPhiID`) ON DELETE CASCADE;

--
-- Constraints for table `thongbao`
--
ALTER TABLE `thongbao`
  ADD CONSTRAINT `thongbao_ibfk_1` FOREIGN KEY (`NguoiGuiID`) REFERENCES `users` (`UserID`) ON DELETE SET NULL;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`RoleID`) REFERENCES `roles` (`RoleID`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
