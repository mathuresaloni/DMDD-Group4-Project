USE HospitalDB
GO


-- =============================
-- Create Stored Procedures
-- =============================

CREATE PROCEDURE sp_AdmitPatient
    @PatientID INT,
    @RoomID INT,
    @DoctorID INT,
    @AdmissionDate DATETIME,
    @Message NVARCHAR(255) OUTPUT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Room WHERE RoomID = @RoomID AND Status = 'Available')
    BEGIN
        INSERT INTO Inpatient (PatientID, PatientType, RoomID, DoctorID, AdmissionDate)
        VALUES (@PatientID, 'Inpatient', @RoomID, @DoctorID, @AdmissionDate);

        UPDATE Room SET Status = 'Occupied' WHERE RoomID = @RoomID;

        SET @Message = 'Patient admitted successfully.';
    END
    ELSE
    BEGIN
        SET @Message = 'Room is not available for admission.';
    END
END;

GO
CREATE PROCEDURE sp_GetDoctorAppointments
    @DoctorID INT,
    @TotalAppointments INT OUTPUT
AS
BEGIN
    SELECT A.AppointmentID, P.Name AS PatientName, A.Date, A.AppointmentTime, A.Reason, A.Status
    FROM Appointment A
    JOIN Patient P ON A.PatientID = P.PatientID
    WHERE A.DoctorID = @DoctorID
    ORDER BY A.Date, A.AppointmentTime;

    -- Set output count
    SELECT @TotalAppointments = COUNT(*) 
    FROM Appointment 
    WHERE DoctorID = @DoctorID;
END;



GO
CREATE PROCEDURE sp_DischargePatient
    @PatientID INT,
    @DischargeDate DATETIME,
    @Success BIT OUTPUT
AS
BEGIN
    DECLARE @RoomID INT;

    SELECT @RoomID = RoomID FROM Inpatient WHERE PatientID = @PatientID;

    IF @RoomID IS NOT NULL
    BEGIN
        UPDATE Inpatient
        SET DischargeDate = @DischargeDate
        WHERE PatientID = @PatientID;

        UPDATE Room
        SET Status = 'Available'
        WHERE RoomID = @RoomID;

        SET @Success = 1;
    END
    ELSE
    BEGIN
        SET @Success = 0;
    END
END;

-- Stored Procedure sp_AdmitPatient test

DECLARE @Message NVARCHAR(255);

EXEC sp_AdmitPatient
    @PatientID = 20,
    @RoomID = 1,
    @DoctorID = 21,
    @AdmissionDate = '2025-03-29',
    @Message = @Message OUTPUT;

PRINT @Message;

SELECT * FROM Inpatient WHERE PatientID = 20;
SELECT Status FROM Room WHERE RoomID = 1;



-- Stored Procedure sp_GetDoctorAppointments test

DECLARE @Count INT;

EXEC sp_GetDoctorAppointments 
    @DoctorID = 21, 
    @TotalAppointments = @Count OUTPUT;

PRINT 'Total Appointments: ' + CAST(@Count AS VARCHAR);



-- Stored Procedure sp_DischargePatient test
DECLARE @Success BIT;

EXEC sp_DischargePatient
    @PatientID = 1,
    @DischargeDate = '2025-03-30',
    @Success = @Success OUTPUT;

PRINT 'Discharge Success: ' + CAST(@Success AS VARCHAR);

SELECT DischargeDate FROM Inpatient WHERE PatientID = 1;
SELECT Status FROM Room WHERE RoomID = 1; 


-- ==============================
-- Create User Defined Functions
-- ==============================

USE HospitalDB
Go


-- Purpose  -   Returns the patient’s full name with ID for displaying in dashboards or views.

CREATE FUNCTION fn_GetFullPatientName
(
    @PatientID INT
)
RETURNS VARCHAR(300)
AS
BEGIN
    DECLARE @FullName VARCHAR(300)

    SELECT @FullName = '[' + CAST(PatientID AS VARCHAR) + '] ' + Name
    FROM Patient
    WHERE PatientID = @PatientID

    RETURN @FullName
END;

SELECT 
    PatientID,
    dbo.fn_GetFullPatientName(PatientID) AS FullName,
    Age,
    dbo.fn_ClassifyPatientAgeGroup(Age) AS AgeGroup,
    dbo.fn_CalculateTotalBill(PatientID) AS TotalBill
FROM Patient
ORDER BY PatientID;

--purpose - Returns the total bill amount for a patient by summing all billing components.

Go
CREATE FUNCTION fn_CalculateTotalBill
(
    @PatientID INT
)
RETURNS DECIMAL(10,2)
AS
BEGIN
    RETURN (
        SELECT 
            SUM(ISNULL(ServiceCharges, 0) + 
                ISNULL(MedicationCharges, 0) + 
                ISNULL(RoomCharges, 0) + 
                ISNULL(ConsultationFee, 0))
        FROM Billing
        WHERE PatientID = @PatientID
        GROUP BY PatientID
    );
END;

SELECT 
    PatientID,
    dbo.fn_CalculateTotalBill(PatientID) AS TotalBill
FROM Patient;


-- Purpose - Classifies a patient’s age group (Child, Adult, Senior).

Go
CREATE FUNCTION fn_ClassifyPatientAgeGroup
(
    @Age INT
)
RETURNS VARCHAR(20)
AS
BEGIN
    DECLARE @Group VARCHAR(20)

    IF @Age < 18
        SET @Group = 'Child'
    ELSE IF @Age BETWEEN 18 AND 59
        SET @Group = 'Adult'
    ELSE
        SET @Group = 'Senior'

    RETURN @Group
END;

SELECT dbo.fn_ClassifyPatientAgeGroup(60) AS AgeGroup;


-- ======================
-- Create Views 
-- ======================

CREATE VIEW vw_CurrentInpatients AS
SELECT 
    ip.PatientID,
    p.Name AS PatientName,
    ip.AdmissionDate,
    r.RoomID,
    r.RoomType,
    d.EmployeeID AS DoctorID,
    d.Email AS DoctorEmail
FROM Inpatient ip
JOIN Patient p ON ip.PatientID = p.PatientID
JOIN Room r ON ip.RoomID = r.RoomID
JOIN Doctor d ON ip.DoctorID = d.EmployeeID
WHERE ip.DischargeDate IS NULL;

SELECT * FROM vw_CurrentInpatients;

--Shows who's currently admitted
--Useful for front desk, nurse staff, or daily reports


CREATE VIEW vw_DoctorAppointments AS
SELECT 
    d.EmployeeID AS DoctorID,
    d.Email AS DoctorEmail,
    p.PatientID,
    p.Name AS PatientName,
    a.Date,
    a.AppointmentTime,
    a.Status
FROM Appointment a
JOIN Doctor d ON a.DoctorID = d.EmployeeID
JOIN Patient p ON a.PatientID = p.PatientID
WHERE a.Status = 'Scheduled';

SELECT * FROM vw_DoctorAppointments;

-- Shows what each doctor has on their schedule


CREATE VIEW vw_PatientBillingSummary AS
SELECT 
    p.PatientID,
    p.Name AS PatientName,
    p.Age,
    dbo.fn_ClassifyPatientAgeGroup(p.Age) AS AgeGroup,
    dbo.fn_CalculateTotalBill(p.PatientID) AS TotalBill
FROM Patient p;

SELECT * FROM vw_PatientBillingSummary;


CREATE VIEW vw_PatientMedicationDetails AS
SELECT 
    p.PatientID,
    p.Name AS PatientName,
    d.EmployeeID AS DoctorID,
    d.Email AS DoctorEmail,
    pr.PrescriptionDate,
    m.Name AS MedicationName,
    pm.Dosage,
    pm.Frequency
FROM Prescription pr
JOIN Patient p ON pr.PatientID = p.PatientID
JOIN Doctor d ON pr.DoctorID = d.EmployeeID
JOIN PrescriptionMedication pm ON pr.PrescriptionID = pm.PrescriptionID
JOIN Medication m ON pm.MedicationID = m.MedicationID;


SELECT * FROM vw_PatientMedicationDetails;



-- =========================
-- Create Trigger
-- =========================


CREATE TRIGGER trg_CascadeDeletePatient
ON Patient
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Only update rooms for inpatients
    UPDATE Room
    SET Status = 'Available'
    FROM Room
    INNER JOIN Inpatient ON Room.RoomID = Inpatient.RoomID
    INNER JOIN deleted ON Inpatient.PatientID = deleted.PatientID
    WHERE deleted.PatientType = 'Inpatient';
    
    -- Delete PrescriptionMedication links only if they exist
    DELETE pm
    FROM PrescriptionMedication pm
    INNER JOIN Prescription p ON pm.PrescriptionID = p.PrescriptionID
    INNER JOIN deleted d ON p.PatientID = d.PatientID;
    
    -- Delete Prescriptions if they exist
    DELETE FROM Prescription WHERE PatientID IN (SELECT PatientID FROM deleted);
    
    -- Delete other related records
    DELETE FROM MedicalRecord WHERE PatientID IN (SELECT PatientID FROM deleted);
    DELETE FROM Appointment WHERE PatientID IN (SELECT PatientID FROM deleted);
    DELETE FROM CareAssignment WHERE PatientID IN (SELECT PatientID FROM deleted);
    DELETE FROM Billing WHERE PatientID IN (SELECT PatientID FROM deleted);
    
    -- Delete Inpatient or Outpatient records conditionally
    DECLARE @PatientCursor CURSOR;
    DECLARE @PatientID INT;
    DECLARE @PatientType VARCHAR(20);
    
    SET @PatientCursor = CURSOR FOR
        SELECT PatientID, PatientType
        FROM deleted;
    
    OPEN @PatientCursor;
    FETCH NEXT FROM @PatientCursor INTO @PatientID, @PatientType;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @PatientType = 'Inpatient'
            DELETE FROM Inpatient WHERE PatientID = @PatientID;
        ELSE
            DELETE FROM Outpatient WHERE PatientID = @PatientID;
        
        FETCH NEXT FROM @PatientCursor INTO @PatientID, @PatientType;
    END;
    
    CLOSE @PatientCursor;
    DEALLOCATE @PatientCursor;
    
    -- Delete the Patient records
    DELETE FROM Patient WHERE PatientID IN (SELECT PatientID FROM deleted);
END;
GO


CREATE TRIGGER trg_UpdateRoomStatusOnDischarge
ON Inpatient
AFTER UPDATE
AS
BEGIN
    
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN deleted d ON i.PatientID = d.PatientID
        WHERE i.DischargeDate IS NOT NULL AND d.DischargeDate IS NULL
    )
    BEGIN
        UPDATE Room
        SET Status = 'Available'
        WHERE RoomID IN (
            SELECT i.RoomID
            FROM inserted i
            JOIN deleted d ON i.PatientID = d.PatientID
            WHERE i.DischargeDate IS NOT NULL AND d.DischargeDate IS NULL
        );
    END
END;

-- Testing trigger 

UPDATE Inpatient
SET DischargeDate = '2025-04-01'
WHERE PatientID = 3;

SELECT RoomID FROM Inpatient WHERE PatientID = 3;
SELECT Status FROM Room WHERE RoomID = 3;

