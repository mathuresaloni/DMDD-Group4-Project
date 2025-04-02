-- Non-Clustered Index 1: Appointments Lookup
-- Purpose: Improve filtering by DoctorID & Date in appointment views
CREATE NONCLUSTERED INDEX IX_Appointment_DoctorID_Date
ON Appointment (DoctorID, Date);


-- Non-Clustered Index 2: Room Availability
-- Purpose: Speeds up queries checking available rooms
CREATE NONCLUSTERED INDEX IX_Room_Status
ON Room (Status);


-- Non-Clustered Index 3: Billing Summary by Patient
-- Purpose: Optimizes lookups on Billing table when calculating patient bills
CREATE NONCLUSTERED INDEX IX_Billing_PatientID
ON Billing (PatientID);