-- ================================================
-- HospitalDB Column Encryption Script
-- Prepared for assignment: Encryption Requirement
-- ================================================

-- Added encrypted columns to store encrypted Email and PhoneNumber
ALTER TABLE Patient
ADD EncryptedEmail VARBINARY(MAX),
    EncryptedPhoneNumber VARBINARY(MAX);


IF EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = 'HospitalSymmetricKey')
    DROP SYMMETRIC KEY HospitalSymmetricKey;

IF EXISTS (SELECT * FROM sys.certificates WHERE name = 'HospitalCert')
    DROP CERTIFICATE HospitalCert;

IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##')
BEGIN
    CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'StrongPassword123!';
END
GO


CREATE CERTIFICATE HospitalCert
WITH SUBJECT = 'Certificate for Hospital Encryption';
GO

CREATE SYMMETRIC KEY HospitalSymmetricKey
WITH ALGORITHM = AES_256
ENCRYPTION BY CERTIFICATE HospitalCert;
GO

OPEN SYMMETRIC KEY HospitalSymmetricKey
DECRYPTION BY CERTIFICATE HospitalCert;

UPDATE Patient
SET 
    EncryptedEmail = CASE 
                        WHEN Email IS NOT NULL THEN ENCRYPTBYKEY(KEY_GUID('HospitalSymmetricKey'), CAST(Email AS VARCHAR(100)))
                        ELSE NULL
                    END,
    EncryptedPhoneNumber = CASE 
                              WHEN PhoneNumber IS NOT NULL THEN ENCRYPTBYKEY(KEY_GUID('HospitalSymmetricKey'), CAST(PhoneNumber AS VARCHAR(15)))
                              ELSE NULL
                          END;

CLOSE SYMMETRIC KEY HospitalSymmetricKey;
GO


-- This is an optional decrytion for the confirmation 

OPEN SYMMETRIC KEY HospitalSymmetricKey
DECRYPTION BY CERTIFICATE HospitalCert;

SELECT 
    PatientID,
    Name,
    CONVERT(VARCHAR, DECRYPTBYKEY(EncryptedEmail)) AS DecryptedEmail,
    CONVERT(VARCHAR, DECRYPTBYKEY(EncryptedPhoneNumber)) AS DecryptedPhone
FROM Patient;

CLOSE SYMMETRIC KEY HospitalSymmetricKey;



-- Encrypting Employee.ContactInfo 

ALTER TABLE Employee
ADD EncryptedContactInfo VARBINARY(MAX);
GO

OPEN SYMMETRIC KEY HospitalSymmetricKey
DECRYPTION BY CERTIFICATE HospitalCert;

UPDATE Employee
SET EncryptedContactInfo = CASE 
    WHEN ContactInfo IS NOT NULL 
    THEN ENCRYPTBYKEY(KEY_GUID('HospitalSymmetricKey'), CAST(ContactInfo AS VARCHAR(255)))
    ELSE NULL
END;

CLOSE SYMMETRIC KEY HospitalSymmetricKey;
GO


-- [Optional] Decryption Test

OPEN SYMMETRIC KEY HospitalSymmetricKey
DECRYPTION BY CERTIFICATE HospitalCert;

SELECT 
    EmployeeID,
    Name,
    ContactInfo,
    CONVERT(VARCHAR, DECRYPTBYKEY(EncryptedContactInfo)) AS DecryptedContactInfo
FROM Employee;

CLOSE SYMMETRIC KEY HospitalSymmetricKey;