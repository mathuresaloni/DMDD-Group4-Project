USE master;
GO
DROP DATABASE IF EXISTS HospitalDB;
GO

-- Create the new database
CREATE DATABASE HospitalDB;
GO

-- Switch to the new database
USE HospitalDB;
GO

-- Hospital Table
CREATE TABLE Hospital (
    HospitalID INT IDENTITY(1,1) PRIMARY KEY,
    HospitalName VARCHAR(255) NOT NULL,
    Location VARCHAR(255) NOT NULL,
    Capacity INT NOT NULL,
    EstablishedYear INT NOT NULL, 
    ContactInfo VARCHAR(255) NOT NULL
);

-- Employee Table with Type Discriminator
CREATE TABLE Employee (
    EmployeeID INT IDENTITY(1,1) PRIMARY KEY,
    HospitalID INT,
    Name VARCHAR(255) NOT NULL,
    Salary DECIMAL(10, 2) CHECK (Salary >= 0),
    ContactInfo VARCHAR(255),
    EmployeeType VARCHAR(20) NOT NULL CHECK (EmployeeType IN ('Receptionist', 'Nurse', 'Doctor')),
    FOREIGN KEY (HospitalID) REFERENCES Hospital(HospitalID)
);

-- Receptionist Table with Type Enforcement
CREATE TABLE Receptionist (
    EmployeeID INT PRIMARY KEY,
    EmployeeType VARCHAR(20) NOT NULL CHECK (EmployeeType = 'Receptionist'),
    DeskNumber INT NOT NULL CHECK (DeskNumber > 0),
    ShiftStartTime DATETIME NOT NULL,
    ShiftEndTime DATETIME NOT NULL,
    FOREIGN KEY (EmployeeID) REFERENCES Employee(EmployeeID)
);

-- Nurse Table with Type Enforcement
CREATE TABLE Nurse (
    EmployeeID INT PRIMARY KEY,
    EmployeeType VARCHAR(20) NOT NULL CHECK (EmployeeType = 'Nurse'),
    ShiftStartTime DATETIME NOT NULL,
    ShiftEndTime DATETIME NOT NULL,
    FOREIGN KEY (EmployeeID) REFERENCES Employee(EmployeeID)
);

-- Doctor Table with Type Enforcement
CREATE TABLE Doctor (
    EmployeeID INT PRIMARY KEY,
    EmployeeType VARCHAR(20) NOT NULL CHECK (EmployeeType = 'Doctor'),
    Availability VARCHAR(255) NOT NULL CHECK (Availability IN ('Full-time', 'Part-time', 'On-call')),
    Phone VARCHAR(20),
    Email VARCHAR(100),
    FOREIGN KEY (EmployeeID) REFERENCES Employee(EmployeeID)
);

-- Room Table
CREATE TABLE Room (
    RoomID INT IDENTITY(1,1) PRIMARY KEY,
    HospitalID INT,
    RoomType VARCHAR(50) CHECK (RoomType IN ('Single', 'Double', 'ICU', 'Emergency')),
    CostPerDay DECIMAL(10, 2) CHECK (CostPerDay >= 0),
    Capacity INT CHECK (Capacity > 0),
    Status VARCHAR(20) CHECK (Status IN ('Occupied', 'Available', 'Under Maintenance')),
    FloorNumber VARCHAR(15),
    FOREIGN KEY (HospitalID) REFERENCES Hospital(HospitalID)
);

-- Payment Method Table with Type Discriminator
CREATE TABLE PaymentMethod (
    PaymentMethodID INT IDENTITY(1,1) PRIMARY KEY,
    Type VARCHAR(50) NOT NULL CHECK (Type IN ('Direct', 'Insurance')),
    Details VARCHAR(255)
);

-- Patient Table with Type Discriminator
CREATE TABLE Patient (
    PatientID INT IDENTITY(1,1) PRIMARY KEY,
    PatientType VARCHAR(10) NOT NULL CHECK (PatientType IN ('Inpatient', 'Outpatient')),
    PaymentMethodID INT,
    Name VARCHAR(255) NOT NULL,
    PhoneNumber VARCHAR(15) NOT NULL CHECK (PhoneNumber LIKE '[0-9]%' AND LEN(PhoneNumber) = 10),
    Gender VARCHAR(10) CHECK(Gender IN ('Male', 'Female', 'Other')) NOT NULL,
    Email VARCHAR(100),
    MedicalHistory TEXT,
    Age INT NOT NULL,
    EmergencyContact VARCHAR(255),
    Address VARCHAR(255),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethod(PaymentMethodID)
);

-- Inpatient Table with Type Enforcement
CREATE TABLE Inpatient (
    PatientID INT PRIMARY KEY,
    PatientType VARCHAR(10) NOT NULL CHECK (PatientType = 'Inpatient'),
    AdmissionDate DATETIME CHECK (AdmissionDate <= CURRENT_TIMESTAMP), 
    DischargeDate DATETIME,
    RoomID INT,
    DoctorID INT,
    FOREIGN KEY (PatientID) REFERENCES Patient(PatientID),
    FOREIGN KEY (RoomID) REFERENCES Room(RoomID),
    FOREIGN KEY (DoctorID) REFERENCES Doctor(EmployeeID)
);

-- Outpatient Table with Type Enforcement
CREATE TABLE Outpatient (
    PatientID INT PRIMARY KEY,
    PatientType VARCHAR(10) NOT NULL CHECK (PatientType = 'Outpatient'),
    VisitDate DATE NOT NULL,
    ConsultationFee DECIMAL(10,2) CHECK (ConsultationFee >= 0),
    FOREIGN KEY (PatientID) REFERENCES Patient(PatientID)
);

-- Direct Payment Table with Type Enforcement
CREATE TABLE DirectPayment (
    PaymentMethodID INT PRIMARY KEY,
    PaymentType VARCHAR(50) NOT NULL CHECK (PaymentType = 'Direct'),
    CreditHolderName VARCHAR(255) NOT NULL,
    ExpiryDate DATE NOT NULL,
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethod(PaymentMethodID)
);

-- Insurance Payment Table with Type Enforcement
CREATE TABLE InsurancePayment (
    PaymentMethodID INT PRIMARY KEY,
    PaymentType VARCHAR(50) NOT NULL CHECK (PaymentType = 'Insurance'),
    InsuranceProvider VARCHAR(50) NOT NULL,
    PolicyNumber VARCHAR(50) NOT NULL,
    ExpiryDate DATE NOT NULL,
    CoverageAmount DECIMAL(10, 2) CHECK (CoverageAmount >= 0),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethod(PaymentMethodID)
);

-- Specialization Table
CREATE TABLE Specialization (
    SpecializationID INT IDENTITY(1,1) PRIMARY KEY,
    SpecializationType VARCHAR(255) NOT NULL CHECK (SpecializationType != '')
);

-- DoctorSpecialization Table
CREATE TABLE DoctorSpecialization (
    SpecializationID INT,
    DoctorID INT,
    PRIMARY KEY (SpecializationID, DoctorID),
    FOREIGN KEY (SpecializationID) REFERENCES Specialization(SpecializationID),
    FOREIGN KEY (DoctorID) REFERENCES Doctor(EmployeeID)
);

-- Appointment Table
CREATE TABLE Appointment (
    AppointmentID INT IDENTITY(1,1) PRIMARY KEY,
    PatientID INT,
    DoctorID INT,
    Date DATE NOT NULL,
    AppointmentTime TIME NOT NULL,
    Reason VARCHAR(255),
    Status VARCHAR(50) CHECK (Status IN ('Scheduled', 'Completed', 'Cancelled')),
    FOREIGN KEY (PatientID) REFERENCES Patient(PatientID),
    FOREIGN KEY (DoctorID) REFERENCES Doctor(EmployeeID)
);

-- CareAssignment Table
CREATE TABLE CareAssignment (
    AssignmentID INT IDENTITY(1,1) PRIMARY KEY,
    NurseID INT,
    PatientID INT,
    TypeOfCare VARCHAR(255) CHECK (TypeOfCare != ''),
    StartDate DATETIME,
    EndDate DATETIME,
    FOREIGN KEY (NurseID) REFERENCES Nurse(EmployeeID),
    FOREIGN KEY (PatientID) REFERENCES Patient(PatientID)
);

-- Pharmacy Table
CREATE TABLE Pharmacy (
    PharmacyID INT IDENTITY(1,1) PRIMARY KEY,
    HospitalID INT,
    Name VARCHAR(255),
    Location VARCHAR(255),
    ContactInfo VARCHAR(255),
    FOREIGN KEY (HospitalID) REFERENCES Hospital(HospitalID)
);

-- Manufacturer Table
CREATE TABLE Manufacturer (
    ManufacturerID INT IDENTITY(1,1) PRIMARY KEY,
    Name VARCHAR(255)
);

-- Medication Table
CREATE TABLE Medication (
    MedicationID INT IDENTITY(1,1) PRIMARY KEY,
    PharmacyID INT,
    ManufacturerID INT,
    Name VARCHAR(255),
    Description TEXT,
    Price DECIMAL(10,2) CHECK (Price >= 0),
    ExpiryDate DATE, 
    FOREIGN KEY (PharmacyID) REFERENCES Pharmacy(PharmacyID),
    FOREIGN KEY (ManufacturerID) REFERENCES Manufacturer(ManufacturerID)
);

-- Prescription Table
CREATE TABLE Prescription (
    PrescriptionID INT IDENTITY(1,1) PRIMARY KEY,
    DoctorID INT,
    PatientID INT,
    PrescriptionDate DATE, 
    Notes TEXT,
    FOREIGN KEY (DoctorID) REFERENCES Doctor(EmployeeID),
    FOREIGN KEY (PatientID) REFERENCES Patient(PatientID)
);

-- Inventory Table
CREATE TABLE Inventory (
    InventoryID INT IDENTITY(1,1) PRIMARY KEY,
    PharmacyID INT,
    MedicationID INT,
    Quantity INT,
    LastUpdated DATETIME,
    FOREIGN KEY (PharmacyID) REFERENCES Pharmacy(PharmacyID),
    FOREIGN KEY (MedicationID) REFERENCES Medication(MedicationID)
);

-- Billing Table
CREATE TABLE Billing (
    BillingID INT IDENTITY(1,1) PRIMARY KEY,
    PatientID INT,
    PaymentMethodID INT,
    ServiceCharges DECIMAL(10, 2) CHECK (ServiceCharges >= 0), 
    MedicationCharges DECIMAL(10, 2) CHECK (MedicationCharges >= 0), 
    RoomCharges DECIMAL(10, 2) CHECK (RoomCharges >= 0), 
    TotalAmount DECIMAL(10, 2) CHECK (TotalAmount >= 0), 
    AmountPaid DECIMAL(10, 2) CHECK (AmountPaid >= 0), 
    ConsultationFee DECIMAL(10, 2) CHECK (ConsultationFee >= 0),
    FOREIGN KEY (PatientID) REFERENCES Patient(PatientID),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethod(PaymentMethodID)
);

-- PrescriptionMedication Table 
CREATE TABLE PrescriptionMedication (
    PrescriptionID INT,
    MedicationID INT,
    Dosage VARCHAR(50),
    Frequency VARCHAR(50),
    PRIMARY KEY (PrescriptionID, MedicationID),
    FOREIGN KEY (PrescriptionID) REFERENCES Prescription(PrescriptionID),
    FOREIGN KEY (MedicationID) REFERENCES Medication(MedicationID)
);

-- Medical Record Table
CREATE TABLE MedicalRecord (
    RecordID INT IDENTITY(1,1)  PRIMARY KEY,
    PatientID INT,
    DoctorID INT,
    VisitDate DATETIME,
    Diagnosis VARCHAR(255),
    PastIllness VARCHAR(255),
    Surgeries VARCHAR(255),
    Prescription VARCHAR(255),
    TreatmentPlan TEXT,
    BloodType VARCHAR(10),
    FOREIGN KEY (PatientID) REFERENCES Patient(PatientID),
    FOREIGN KEY (DoctorID) REFERENCES Doctor(EmployeeID)
);

USE HospitalDB;
GO

-- Insert 10 Hospitals
INSERT INTO Hospital (HospitalName, Location, Capacity, EstablishedYear, ContactInfo) VALUES
('City General', 'New York', 500, 1990, '555-0101'),
('Central Clinic', 'Los Angeles', 300, 1985, '555-0102'),
('Metro Health', 'Chicago', 450, 2000, '555-0103'),
('Sunrise Hospital', 'Miami', 350, 2010, '555-0104'),
('Alpine Medical', 'Denver', 200, 1975, '555-0105'),
('Bayview Hospital', 'San Francisco', 400, 1995, '555-0106'),
('Pine Valley Clinic', 'Seattle', 250, 2005, '555-0107'),
('Desert Care', 'Phoenix', 300, 1980, '555-0108'),
('Midwest Regional', 'Dallas', 600, 1960, '555-0109'),
('Coastal Medical', 'Boston', 280, 2015, '555-0110');
GO

-- Insert 30 Employees (10 Receptionists, 10 Nurses, 10 Doctors)
INSERT INTO Employee (HospitalID, Name, Salary, ContactInfo, EmployeeType) VALUES
-- Receptionists (1-10)
(1, 'John Doe', 30000.00, 'john@example.com', 'Receptionist'),
(2, 'Jane Smith', 32000.00, 'jane@example.com', 'Receptionist'),
(3, 'Bob Wilson', 31000.00, 'bob@example.com', 'Receptionist'),
(4, 'Alice Brown', 30500.00, 'alice@example.com', 'Receptionist'),
(5, 'Charlie Green', 31500.00, 'charlie@example.com', 'Receptionist'),
(6, 'Diana White', 32500.00, 'diana@example.com', 'Receptionist'),
(7, 'Ethan Black', 30000.00, 'ethan@example.com', 'Receptionist'),
(8, 'Fiona Gray', 33000.00, 'fiona@example.com', 'Receptionist'),
(9, 'George Blue', 31000.00, 'george@example.com', 'Receptionist'),
(10, 'Hannah Yellow', 32000.00, 'hannah@example.com', 'Receptionist'),
-- Nurses (11-20)
(1, 'Ivy Adams', 45000.00, 'ivy@example.com', 'Nurse'),
(2, 'Jack Carter', 46000.00, 'jack@example.com', 'Nurse'),
(3, 'Karen Davis', 47000.00, 'karen@example.com', 'Nurse'),
(4, 'Liam Evans', 48000.00, 'liam@example.com', 'Nurse'),
(5, 'Mia Foster', 49000.00, 'mia@example.com', 'Nurse'),
(6, 'Noah Green', 50000.00, 'noah@example.com', 'Nurse'),
(7, 'Olivia Hall', 51000.00, 'olivia@example.com', 'Nurse'),
(8, 'Peter Inman', 52000.00, 'peter@example.com', 'Nurse'),
(9, 'Quinn Jones', 53000.00, 'quinn@example.com', 'Nurse'),
(10, 'Rachel King', 54000.00, 'rachel@example.com', 'Nurse'),
-- Doctors (21-30)
(1, 'Samuel Lee', 120000.00, 'samuel@example.com', 'Doctor'),
(2, 'Tina Moore', 130000.00, 'tina@example.com', 'Doctor'),
(3, 'Umar Nazir', 125000.00, 'umar@example.com', 'Doctor'),
(4, 'Victoria Park', 140000.00, 'victoria@example.com', 'Doctor'),
(5, 'Walter Quinn', 135000.00, 'walter@example.com', 'Doctor'),
(6, 'Xena Rhodes', 145000.00, 'xena@example.com', 'Doctor'),
(7, 'Yusuf Shah', 150000.00, 'yusuf@example.com', 'Doctor'),
(8, 'Zara Taylor', 160000.00, 'zara@example.com', 'Doctor'),
(9, 'Aaron Wells', 155000.00, 'aaron@example.com', 'Doctor'),
(10, 'Bella Young', 165000.00, 'bella@example.com', 'Doctor');
GO

-- Insert 10 Receptionists
INSERT INTO Receptionist (EmployeeID, EmployeeType, DeskNumber, ShiftStartTime, ShiftEndTime) VALUES
(1, 'Receptionist', 1, '2023-01-01 08:00:00', '2023-01-01 16:00:00'),
(2, 'Receptionist', 2, '2023-01-01 09:00:00', '2023-01-01 17:00:00'),
(3, 'Receptionist', 3, '2023-01-01 07:00:00', '2023-01-01 15:00:00'),
(4, 'Receptionist', 4, '2023-01-01 10:00:00', '2023-01-01 18:00:00'),
(5, 'Receptionist', 5, '2023-01-01 08:30:00', '2023-01-01 16:30:00'),
(6, 'Receptionist', 6, '2023-01-01 07:30:00', '2023-01-01 15:30:00'),
(7, 'Receptionist', 7, '2023-01-01 11:00:00', '2023-01-01 19:00:00'),
(8, 'Receptionist', 8, '2023-01-01 12:00:00', '2023-01-01 20:00:00'),
(9, 'Receptionist', 9, '2023-01-01 06:00:00', '2023-01-01 14:00:00'),
(10, 'Receptionist', 10, '2023-01-01 13:00:00', '2023-01-01 21:00:00');
GO

-- Insert 10 Nurses
INSERT INTO Nurse (EmployeeID, EmployeeType, ShiftStartTime, ShiftEndTime) VALUES
(11, 'Nurse', '2023-01-01 07:00:00', '2023-01-01 15:00:00'),
(12, 'Nurse', '2023-01-01 15:00:00', '2023-01-01 23:00:00'),
(13, 'Nurse', '2023-01-01 08:00:00', '2023-01-01 16:00:00'),
(14, 'Nurse', '2023-01-01 16:00:00', '2023-01-01 00:00:00'),
(15, 'Nurse', '2023-01-01 09:00:00', '2023-01-01 17:00:00'),
(16, 'Nurse', '2023-01-01 17:00:00', '2023-01-02 01:00:00'),
(17, 'Nurse', '2023-01-01 10:00:00', '2023-01-01 18:00:00'),
(18, 'Nurse', '2023-01-01 18:00:00', '2023-01-02 02:00:00'),
(19, 'Nurse', '2023-01-01 11:00:00', '2023-01-01 19:00:00'),
(20, 'Nurse', '2023-01-01 19:00:00', '2023-01-02 03:00:00');
GO

-- Insert 10 Doctors
INSERT INTO Doctor (EmployeeID, EmployeeType, Availability, Phone, Email) VALUES
(21, 'Doctor', 'Full-time', '555-1001', 'doc1@example.com'),
(22, 'Doctor', 'Part-time', '555-1002', 'doc2@example.com'),
(23, 'Doctor', 'Full-time', '555-1003', 'doc3@example.com'),
(24, 'Doctor', 'On-call', '555-1004', 'doc4@example.com'),
(25, 'Doctor', 'Full-time', '555-1005', 'doc5@example.com'),
(26, 'Doctor', 'Part-time', '555-1006', 'doc6@example.com'),
(27, 'Doctor', 'On-call', '555-1007', 'doc7@example.com'),
(28, 'Doctor', 'Full-time', '555-1008', 'doc8@example.com'),
(29, 'Doctor', 'Part-time', '555-1009', 'doc9@example.com'),
(30, 'Doctor', 'Full-time', '555-1010', 'doc10@example.com');
GO

-- Insert 10 Rooms
INSERT INTO Room (HospitalID, RoomType, CostPerDay, Capacity, Status, FloorNumber) VALUES
(1, 'Single', 200.00, 1, 'Available', '1'),
(2, 'Double', 150.00, 2, 'Occupied', '2'),
(3, 'ICU', 500.00, 1, 'Under Maintenance', '3'),
(4, 'Emergency', 300.00, 4, 'Available', '1'),
(5, 'Single', 220.00, 1, 'Occupied', '2'),
(6, 'Double', 170.00, 2, 'Available', '3'),
(7, 'ICU', 550.00, 1, 'Available', '1'),
(8, 'Emergency', 320.00, 4, 'Under Maintenance', '2'),
(9, 'Single', 210.00, 1, 'Available', '3'),
(10, 'Double', 160.00, 2, 'Occupied', '1');
GO

-- Insert 20 Payment Methods (10 Direct, 10 Insurance)
INSERT INTO PaymentMethod (Type, Details) VALUES
('Direct', 'Credit Card'),
('Direct', 'Debit Card'),
('Direct', 'Cash'),
('Direct', 'Check'),
('Direct', 'Online Transfer'),
('Direct', 'Mobile Wallet'),
('Direct', 'Bank Draft'),
('Direct', 'Money Order'),
('Direct', 'Cryptocurrency'),
('Direct', 'Gift Card'),
('Insurance', 'HealthPlus Inc.'),
('Insurance', 'MediCare Corp.'),
('Insurance', 'SecureHealth'),
('Insurance', 'Family Shield'),
('Insurance', 'Total Coverage'),
('Insurance', 'Wellness Partners'),
('Insurance', 'Global Health'),
('Insurance', 'Prime Care'),
('Insurance', 'United Health'),
('Insurance', 'LifeGuard');
GO

-- Insert 20 Patients (10 Inpatients, 10 Outpatients)
INSERT INTO Patient (PatientType, PaymentMethodID, Name, PhoneNumber, Gender, Email, Age, EmergencyContact, Address) VALUES
-- Inpatients
('Inpatient', 1, 'Patient A', '1234567890', 'Male', 'a@example.com', 45, 'EmergA', 'Address A'),
('Inpatient', 2, 'Patient B', '1234567891', 'Female', 'b@example.com', 32, 'EmergB', 'Address B'),
('Inpatient', 3, 'Patient C', '1234567892', 'Other', 'c@example.com', 28, 'EmergC', 'Address C'),
('Inpatient', 4, 'Patient D', '1234567893', 'Male', 'd@example.com', 50, 'EmergD', 'Address D'),
('Inpatient', 5, 'Patient E', '1234567894', 'Female', 'e@example.com', 60, 'EmergE', 'Address E'),
('Inpatient', 6, 'Patient F', '1234567895', 'Other', 'f@example.com', 22, 'EmergF', 'Address F'),
('Inpatient', 7, 'Patient G', '1234567896', 'Male', 'g@example.com', 38, 'EmergG', 'Address G'),
('Inpatient', 8, 'Patient H', '1234567897', 'Female', 'h@example.com', 41, 'EmergH', 'Address H'),
('Inpatient', 9, 'Patient I', '1234567898', 'Other', 'i@example.com', 55, 'EmergI', 'Address I'),
('Inpatient', 10, 'Patient J', '1234567899', 'Male', 'j@example.com', 29, 'EmergJ', 'Address J'),
-- Outpatients
('Outpatient', 11, 'Patient K', '1234567800', 'Female', 'k@example.com', 35, 'EmergK', 'Address K'),
('Outpatient', 12, 'Patient L', '1234567801', 'Other', 'l@example.com', 40, 'EmergL', 'Address L'),
('Outpatient', 13, 'Patient M', '1234567802', 'Male', 'm@example.com', 27, 'EmergM', 'Address M'),
('Outpatient', 14, 'Patient N', '1234567803', 'Female', 'n@example.com', 33, 'EmergN', 'Address N'),
('Outpatient', 15, 'Patient O', '1234567804', 'Other', 'o@example.com', 48, 'EmergO', 'Address O'),
('Outpatient', 16, 'Patient P', '1234567805', 'Male', 'p@example.com', 50, 'EmergP', 'Address P'),
('Outpatient', 17, 'Patient Q', '1234567806', 'Female', 'q@example.com', 29, 'EmergQ', 'Address Q'),
('Outpatient', 18, 'Patient R', '1234567807', 'Other', 'r@example.com', 42, 'EmergR', 'Address R'),
('Outpatient', 19, 'Patient S', '1234567808', 'Male', 's@example.com', 37, 'EmergS', 'Address S'),
('Outpatient', 20, 'Patient T', '1234567809', 'Female', 't@example.com', 44, 'EmergT', 'Address T');
GO

-- Insert 10 Inpatients
INSERT INTO Inpatient (PatientID, PatientType, AdmissionDate, RoomID, DoctorID) VALUES
(1, 'Inpatient', '2023-01-01', 1, 21),
(2, 'Inpatient', '2023-02-01', 2, 22),
(3, 'Inpatient', '2023-03-01', 3, 23),
(4, 'Inpatient', '2023-04-01', 4, 24),
(5, 'Inpatient', '2023-05-01', 5, 25),
(6, 'Inpatient', '2023-06-01', 6, 26),
(7, 'Inpatient', '2023-07-01', 7, 27),
(8, 'Inpatient', '2023-08-01', 8, 28),
(9, 'Inpatient', '2023-09-01', 9, 29),
(10, 'Inpatient', '2023-10-01', 10, 30);
GO

-- Insert 10 Outpatients
INSERT INTO Outpatient (PatientID, PatientType, VisitDate, ConsultationFee) VALUES
(11, 'Outpatient', '2024-01-01', 50.00),
(12, 'Outpatient', '2024-02-01', 60.00),
(13, 'Outpatient', '2024-03-01', 55.00),
(14, 'Outpatient', '2024-04-01', 65.00),
(15, 'Outpatient', '2024-05-01', 70.00),
(16, 'Outpatient', '2024-06-01', 45.00),
(17, 'Outpatient', '2024-07-01', 80.00),
(18, 'Outpatient', '2024-08-01', 75.00),
(19, 'Outpatient', '2024-09-01', 90.00),
(20, 'Outpatient', '2024-10-01', 100.00);
GO

-- Insert 20 Payment Methods (10 Direct, 10 Insurance)
INSERT INTO PaymentMethod (Type, Details) VALUES
('Direct', 'Credit Card'),
('Direct', 'Debit Card'),
('Direct', 'Cash'),
('Direct', 'Check'),
('Direct', 'Online Transfer'),
('Direct', 'Mobile Wallet'),
('Direct', 'Bank Draft'),
('Direct', 'Money Order'),
('Direct', 'Cryptocurrency'),
('Direct', 'Gift Card'),
('Insurance', 'HealthPlus Inc.'),
('Insurance', 'MediCare Corp.'),
('Insurance', 'SecureHealth'),
('Insurance', 'Family Shield'),
('Insurance', 'Total Coverage'),
('Insurance', 'Wellness Partners'),
('Insurance', 'Global Health'),
('Insurance', 'Prime Care'),
('Insurance', 'United Health'),
('Insurance', 'LifeGuard');
GO

-- Insert 10 Direct Payments
INSERT INTO DirectPayment (PaymentMethodID, PaymentType, CreditHolderName, ExpiryDate) VALUES
(1, 'Direct', 'John Smith', '2025-12-31'),
(2, 'Direct', 'Emma Johnson', '2026-06-30'),
(3, 'Direct', 'Michael Brown', '2025-09-30'),
(4, 'Direct', 'Sarah Davis', '2026-03-31'),
(5, 'Direct', 'David Wilson', '2025-11-30'),
(6, 'Direct', 'Laura Martinez', '2026-05-31'),
(7, 'Direct', 'James Anderson', '2025-08-31'),
(8, 'Direct', 'Linda Thomas', '2026-02-28'),
(9, 'Direct', 'Robert Taylor', '2025-10-31'),
(10, 'Direct', 'Patricia Moore', '2026-04-30');
GO

-- Insert 10 Insurance Payments
INSERT INTO InsurancePayment (PaymentMethodID, PaymentType, InsuranceProvider, PolicyNumber, ExpiryDate, CoverageAmount) VALUES
(11, 'Insurance', 'HealthPlus Inc.', 'POL12345', '2025-12-31', 10000.00),
(12, 'Insurance', 'MediCare Corp.', 'POL67890', '2026-06-30', 15000.00),
(13, 'Insurance', 'SecureHealth', 'POL13579', '2025-09-30', 20000.00),
(14, 'Insurance', 'Family Shield', 'POL24680', '2026-03-31', 25000.00),
(15, 'Insurance', 'Total Coverage', 'POL11223', '2025-11-30', 30000.00),
(16, 'Insurance', 'Wellness Partners', 'POL44556', '2026-05-31', 35000.00),
(17, 'Insurance', 'Global Health', 'POL77889', '2025-08-31', 40000.00),
(18, 'Insurance', 'Prime Care', 'POL99000', '2026-02-28', 45000.00),
(19, 'Insurance', 'United Health', 'POL54321', '2025-10-31', 50000.00),
(20, 'Insurance', 'LifeGuard', 'POL98765', '2026-04-30', 55000.00);
GO

-- Insert 10 Specializations
INSERT INTO Specialization (SpecializationType) VALUES
('Cardiology'),
('Neurology'),
('Pediatrics'),
('Oncology'),
('Orthopedics'),
('Dermatology'),
('Gastroenterology'),
('Endocrinology'),
('Rheumatology'),
('Pulmonology');
GO

-- Insert 10 Doctor Specializations
INSERT INTO DoctorSpecialization (SpecializationID, DoctorID) VALUES
(1, 21),
(2, 22),
(3, 23),
(4, 24),
(5, 25),
(6, 26),
(7, 27),
(8, 28),
(9, 29),
(10, 30);
GO

-- Insert 10 Pharmacies
INSERT INTO Pharmacy (HospitalID, Name, Location, ContactInfo) VALUES
(1, 'Main Pharmacy', 'Floor 1', '555-2001'),
(2, 'Central Pharmacy', 'Floor 2', '555-2002'),
(3, 'North Pharmacy', 'Floor 3', '555-2003'),
(4, 'South Pharmacy', 'Floor 1', '555-2004'),
(5, 'East Pharmacy', 'Floor 2', '555-2005'),
(6, 'West Pharmacy', 'Floor 3', '555-2006'),
(7, 'Emergency Pharmacy', 'ER Wing', '555-2007'),
(8, 'Outpatient Pharmacy', 'Clinic Wing', '555-2008'),
(9, 'Inpatient Pharmacy', 'Ward 5', '555-2009'),
(10, 'Specialty Pharmacy', 'Floor 4', '555-2010');
GO

-- Insert 10 Manufacturers
INSERT INTO Manufacturer (Name) VALUES
('PharmaCorp'),
('MediLife'),
('HealthGen'),
('CureWell'),
('BioPharm'),
('GenLab'),
('TheraSolutions'),
('VitaMed'),
('PureCure'),
('NovaPharm');
GO

-- Insert 10 Medications
INSERT INTO Medication (PharmacyID, ManufacturerID, Name, Description, Price, ExpiryDate) VALUES
(1, 1, 'PainAway', 'Pain Reliever', 10.99, '2025-12-31'),
(2, 2, 'ColdFix', 'Cold Remedy', 8.50, '2026-06-30'),
(3, 3, 'AlleriStop', 'Allergy Relief', 15.00, '2025-09-30'),
(4, 4, 'DigestEase', 'Digestive Aid', 12.75, '2026-03-31'),
(5, 5, 'FlexiJoint', 'Joint Health', 22.99, '2025-11-30'),
(6, 6, 'SleepWell', 'Sleep Aid', 18.50, '2026-05-31'),
(7, 7, 'ImmuneBoost', 'Immune Support', 25.00, '2025-08-31'),
(8, 8, 'HeartGuard', 'Cardiovascular Health', 30.00, '2026-02-28'),
(9, 9, 'DermaCare', 'Skin Health', 14.99, '2025-10-31'),
(10, 10, 'LungClear', 'Respiratory Support', 20.50, '2026-04-30');
GO

-- Insert 10 Prescriptions
INSERT INTO Prescription (DoctorID, PatientID, PrescriptionDate, Notes) VALUES
(21, 1, '2023-01-01', 'Take once daily'),
(22, 2, '2023-02-01', 'Take with food'),
(23, 3, '2023-03-01', 'Apply topically'),
(24, 4, '2023-04-01', 'Avoid alcohol'),
(25, 5, '2023-05-01', 'Store in cool place'),
(26, 6, '2023-06-01', 'Do not crush'),
(27, 7, '2023-07-01', 'Take before bedtime'),
(28, 8, '2023-08-01', 'Use as needed'),
(29, 9, '2023-09-01', 'Complete full course'),
(30, 10, '2023-10-01', 'Consult if rash occurs');
GO

-- Insert 10 Inventory Items
INSERT INTO Inventory (PharmacyID, MedicationID, Quantity, LastUpdated) VALUES
(1, 1, 100, GETDATE()),
(2, 2, 150, GETDATE()),
(3, 3, 200, GETDATE()),
(4, 4, 90, GETDATE()),
(5, 5, 120, GETDATE()),
(6, 6, 80, GETDATE()),
(7, 7, 300, GETDATE()),
(8, 8, 75, GETDATE()),
(9, 9, 180, GETDATE()),
(10, 10, 95, GETDATE());
GO

-- Insert 10 Appointments
INSERT INTO Appointment (PatientID, DoctorID, Date, AppointmentTime, Reason, Status) VALUES
(11, 21, '2024-01-01', '09:00:00', 'Checkup', 'Scheduled'),
(12, 22, '2024-02-01', '10:00:00', 'Follow-up', 'Scheduled'),
(13, 23, '2024-03-01', '11:00:00', 'Vaccination', 'Scheduled'),
(14, 24, '2024-04-01', '14:00:00', 'Consultation', 'Scheduled'),
(15, 25, '2024-05-01', '15:00:00', 'Pain Management', 'Scheduled'),
(16, 26, '2024-06-01', '16:00:00', 'Allergy Test', 'Scheduled'),
(17, 27, '2024-07-01', '17:00:00', 'Dermatology', 'Scheduled'),
(18, 28, '2024-08-01', '18:00:00', 'Cardio Check', 'Scheduled'),
(19, 29, '2024-09-01', '19:00:00', 'Ortho Consult', 'Scheduled'),
(20, 30, '2024-10-01', '20:00:00', 'Post-Op', 'Scheduled');
GO

-- Insert 10 Care Assignments
INSERT INTO CareAssignment (NurseID, PatientID, TypeOfCare, StartDate, EndDate) VALUES
(11, 1, 'Post-Op Care', '2023-01-01', '2023-01-10'),
(12, 2, 'Wound Dressing', '2023-02-01', '2023-02-10'),
(13, 3, 'Medication Admin', '2023-03-01', '2023-03-10'),
(14, 4, 'Physical Therapy', '2023-04-01', '2023-04-10'),
(15, 5, 'Monitoring', '2023-05-01', '2023-05-10'),
(16, 6, 'IV Management', '2023-06-01', '2023-06-10'),
(17, 7, 'Pain Management', '2023-07-01', '2023-07-10'),
(18, 8, 'Hygiene Care', '2023-08-01', '2023-08-10'),
(19, 9, 'Feeding Assist', '2023-09-01', '2023-09-10'),
(20, 10, 'Mobility Assist', '2023-10-01', '2023-10-10');
GO

-- Insert 10 Billing Records
INSERT INTO Billing (PatientID, PaymentMethodID, ServiceCharges, MedicationCharges, RoomCharges, TotalAmount, AmountPaid, ConsultationFee) VALUES
(1, 13, 500.00, 50.00, 200.00, 750.00, 750.00, 0.00),
(2, 15, 600.00, 60.00, 300.00, 960.00, 960.00, 0.00),
(3, 10, 700.00, 70.00, 400.00, 1170.00, 1170.00, 0.00),
(4, 2, 800.00, 80.00, 500.00, 1380.00, 1380.00, 0.00),
(5, 6, 900.00, 90.00, 600.00, 1590.00, 1590.00, 0.00),
(6, 8, 1000.00, 100.00, 700.00, 1800.00, 1800.00, 0.00),
(7, 14, 1100.00, 110.00, 800.00, 2010.00, 2010.00, 0.00),
(8, 17, 1200.00, 120.00, 900.00, 2220.00, 2220.00, 0.00),
(9, 18, 1300.00, 130.00, 1000.00, 2430.00, 2430.00, 0.00),
(10, 19, 1400.00, 140.00, 1100.00, 2640.00, 2640.00, 0.00);
GO

-- Insert 10 PrescriptionMedication Links
INSERT INTO PrescriptionMedication (PrescriptionID, MedicationID, Dosage, Frequency) VALUES
(1, 1, '500mg', 'Once Daily'),
(2, 2, '10ml', 'Twice Daily'),
(3, 3, '1 Tablet', 'Every 6 Hours'),
(4, 4, '2 Capsules', 'With Meals'),
(5, 5, 'Apply Thinly', 'As Needed'),
(6, 6, '1 Spray', 'Nightly'),
(7, 7, '1 Drop', 'Morning'),
(8, 8, '2 Puffs', 'Every 12 Hours'),
(9, 9, '1 Patch', 'Weekly'),
(10, 10, '1 Inhalation', 'Daily');
GO

-- Insert 10 Medical Records
INSERT INTO MedicalRecord (PatientID, DoctorID, VisitDate, Diagnosis, PastIllness, Surgeries, Prescription, TreatmentPlan, BloodType) VALUES
(1, 21, '2023-01-01', 'Hypertension', 'None', 'Appendectomy', 'Presc1', 'Lifestyle Modifications', 'A+'),
(2, 22, '2023-02-01', 'Diabetes', 'Asthma', 'None', 'Presc2', 'Insulin Therapy', 'B+'),
(3, 23, '2023-03-01', 'Migraine', 'None', 'Tonsillectomy', 'Presc3', 'Preventive Medication', 'O+'),
(4, 24, '2023-04-01', 'Arthritis', 'Hypertension', 'Knee Replacement', 'Presc4', 'Physical Therapy', 'AB+'),
(5, 25, '2023-05-01', 'Pneumonia', 'None', 'None', 'Presc5', 'Antibiotics', 'A-'),
(6, 26, '2023-06-01', 'Eczema', 'Diabetes', 'None', 'Presc6', 'Topical Creams', 'B-'),
(7, 27, '2023-07-01', 'GERD', 'None', 'Gallbladder Removal', 'Presc7', 'PPI Therapy', 'O-'),
(8, 28, '2023-08-01', 'Asthma', 'None', 'None', 'Presc8', 'Inhaler Use', 'AB-'),
(9, 29, '2023-09-01', 'Fracture', 'Osteoporosis', 'Hip Surgery', 'Presc9', 'Cast Application', 'A+'),
(10, 30, '2023-10-01', 'Anemia', 'None', 'None', 'Presc10', 'Iron Supplements', 'B+');
GO



