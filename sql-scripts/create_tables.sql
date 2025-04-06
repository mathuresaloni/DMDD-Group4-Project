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