const express = require("express");
const bodyParser = require("body-parser");
const sql = require("mssql");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:3000" }));

// Serve static files from the images directory
app.use("/images", express.static(path.join(__dirname, "public/images")));

const dbConfig = {
  user: "sa",
  password: "YourSTRONGPassword123",
  server: "localhost",
  database: "HospitalDB",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

sql.connect(dbConfig, (err) => {
  if (err) console.error("Database connection failed", err);
  else console.log("SQL Server Connected");
});

// Fetch all appointments along with patient and doctor details
app.get("/appointments", async (req, res) => {
  try {
    const result = await sql.query(`SELECT * FROM Appointment`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/doctors", async (req, res) => {
  try {
    const result = await sql.query(
      "SELECT * FROM Employee WHERE EmployeeType='Doctor'"
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard statistics endpoint that combines all counts
app.get("/api/dashboard-stats", async (req, res) => {
  try {
    // Create a new SQL connection pool request
    const request = new sql.Request();

    // Get count of currently admitted patients (Inpatients without discharge date)
    const patientResult = await request.query(`
      SELECT COUNT(*) AS admittedPatients 
      FROM Inpatient 
      WHERE DischargeDate IS NULL
    `);

    // Get count of available rooms
    const roomResult = await request.query(`
      SELECT COUNT(*) AS availableRooms 
      FROM Room 
      WHERE Status = 'Available'
    `);

    // Get count of today's appointments
    const appointmentResult = await request.query(`
      SELECT COUNT(*) AS todayAppointments 
      FROM Appointment 
      WHERE CONVERT(date, Date) = CONVERT(date, GETDATE())
    `);

    // Get total count of medication items in stock across all pharmacies
    const pharmacyResult = await request.query(`
      SELECT SUM(Quantity) AS stockItems 
      FROM Inventory
    `);

    // Combine all stats into one response object
    const dashboardStats = {
      admittedPatients: patientResult.recordset[0].admittedPatients || 0,
      availableRooms: roomResult.recordset[0].availableRooms || 0,
      todayAppointments: appointmentResult.recordset[0].todayAppointments || 0,
      stockItems: pharmacyResult.recordset[0].stockItems || 0,
    };

    res.json(dashboardStats);
  } catch (err) {
    console.error("Error fetching dashboard statistics:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all inpatients with complete information including room details
app.get("/inpatients", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT i.*, p.Name, p.Age, p.Gender, p.PhoneNumber, p.Email, p.Address, p.EmergencyContact,
             r.RoomID, r.RoomType, r.CostPerDay, r.FloorNumber, r.Capacity, r.Status AS RoomStatus
      FROM Inpatient i
      JOIN Patient p ON i.PatientID = p.PatientID
      LEFT JOIN Room r ON i.RoomID = r.RoomID
      WHERE i.DischargeDate IS NULL
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching inpatients:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all outpatients with complete information
app.get("/outpatients", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT o.*, p.Name, p.Age, p.Gender, p.PhoneNumber, p.Email, p.Address, p.EmergencyContact,
             CONVERT(VARCHAR(10), o.VisitDate, 120) AS FormattedVisitDate
      FROM Outpatient o
      JOIN Patient p ON o.PatientID = p.PatientID
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching outpatients:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get combined patient information with correct type data
app.get("/patients", async (req, res) => {
  try {
    // First get all patients
    const baseResult = await sql.query(`
      SELECT * FROM Patient 
    `);

    // Get all inpatients with room info
    const inpatientResult = await sql.query(`
      SELECT i.PatientID, i.RoomID, i.DoctorID, i.AdmissionDate, i.DischargeDate,
             r.RoomType, r.FloorNumber, r.CostPerDay
      FROM Inpatient i
      LEFT JOIN Room r ON i.RoomID = r.RoomID
      WHERE i.DischargeDate IS NULL
    `);

    // Get all outpatients with visit info
    const outpatientResult = await sql.query(`
      SELECT o.PatientID, o.VisitDate, o.ConsultationFee,
             CONVERT(VARCHAR(10), o.VisitDate, 120) AS FormattedVisitDate 
      FROM Outpatient o
    `);

    // Create lookup maps
    const inpatientMap = new Map();
    inpatientResult.recordset.forEach((record) => {
      inpatientMap.set(record.PatientID, record);
    });

    const outpatientMap = new Map();
    outpatientResult.recordset.forEach((record) => {
      outpatientMap.set(record.PatientID, record);
    });

    // Combine all data
    const enhancedPatients = baseResult.recordset.map((patient) => {
      const result = { ...patient };

      if (patient.PatientType === "Inpatient") {
        const inpatientData = inpatientMap.get(patient.PatientID);
        if (inpatientData) {
          Object.assign(result, inpatientData);
        }
      } else if (patient.PatientType === "Outpatient") {
        const outpatientData = outpatientMap.get(patient.PatientID);
        if (outpatientData) {
          Object.assign(result, outpatientData);
        }
      }

      return result;
    });

    res.json(enhancedPatients);
  } catch (err) {
    console.error("Error fetching enhanced patients:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get detailed patient information by ID
app.get("/patients/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Get basic patient info
    const patientResult = await sql.query(`
      SELECT * FROM Patient WHERE PatientID = ${id}
    `);

    if (patientResult.recordset.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const patient = patientResult.recordset[0];

    // Get additional info based on patient type
    if (patient.PatientType === "Inpatient") {
      const inpatientResult = await sql.query(`
        SELECT * FROM Inpatient WHERE PatientID = ${id}
      `);

      if (inpatientResult.recordset.length > 0) {
        // Merge inpatient details
        Object.assign(patient, inpatientResult.recordset[0]);
      }
    } else if (patient.PatientType === "Outpatient") {
      const outpatientResult = await sql.query(`
        SELECT * FROM Outpatient WHERE PatientID = ${id}
      `);

      if (outpatientResult.recordset.length > 0) {
        // Merge outpatient details
        Object.assign(patient, outpatientResult.recordset[0]);
      }
    }

    res.json(patient);
  } catch (err) {
    console.error(`Error fetching patient ${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/patients", async (req, res) => {
  const { Name, PhoneNumber, Gender, Age, PatientType } = req.body;
  try {
    const result = await sql.query(
      `INSERT INTO Patient (Name, PhoneNumber, Gender, Age, PatientType) VALUES ('${Name}', '${PhoneNumber}', '${Gender}', ${Age}, '${PatientType}')`
    );
    res.json({ message: "Patient added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add this endpoint to your server.js file

// Update patient endpoint
app.put("/patients/:id", async (req, res) => {
  const { id } = req.params;
  const {
    Name,
    PhoneNumber,
    Gender,
    Email,
    Age,
    Address,
    EmergencyContact,
    PatientType,
    RoomID,
    DoctorID,
    VisitDate,
    ConsultationFee,
  } = req.body;

  console.log(`Received update request for patient ID: ${id}`, req.body);

  try {
    // Start a transaction
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // 1. Update the patient record
      await transaction
        .request()
        .input("PatientID", sql.Int, id)
        .input("Name", sql.NVarChar, Name)
        .input("PhoneNumber", sql.NVarChar, PhoneNumber)
        .input("Gender", sql.NVarChar, Gender)
        .input("Email", sql.NVarChar, Email || null)
        .input("Age", sql.Int, Age)
        .input("Address", sql.NVarChar, Address || null)
        .input("EmergencyContact", sql.NVarChar, EmergencyContact || null)
        .query(`
          UPDATE Patient
          SET Name = @Name,
              PhoneNumber = @PhoneNumber,
              Gender = @Gender,
              Email = @Email,
              Age = @Age,
              Address = @Address,
              EmergencyContact = @EmergencyContact
          WHERE PatientID = @PatientID
        `);

      // 2. If inpatient, update inpatient record
      if (PatientType === "Inpatient" && RoomID) {
        // Check if inpatient record exists
        const inpatientCheck = await transaction
          .request()
          .input("PatientID", sql.Int, id).query(`
            SELECT COUNT(*) AS count
            FROM Inpatient
            WHERE PatientID = @PatientID
          `);

        if (inpatientCheck.recordset[0].count > 0) {
          // Update inpatient record
          await transaction
            .request()
            .input("PatientID", sql.Int, id)
            .input("RoomID", sql.Int, RoomID)
            .input("DoctorID", sql.Int, DoctorID).query(`
              UPDATE Inpatient
              SET RoomID = @RoomID,
                  DoctorID = @DoctorID
              WHERE PatientID = @PatientID
            `);

          // Update room status if changed
          if (RoomID) {
            // Get previous room ID
            const prevRoomResult = await transaction
              .request()
              .input("PatientID", sql.Int, id).query(`
                SELECT RoomID
                FROM Inpatient
                WHERE PatientID = @PatientID
              `);

            const prevRoomID = prevRoomResult.recordset[0]?.RoomID;

            // If room changed, update statuses
            if (prevRoomID && prevRoomID !== RoomID) {
              // Set previous room to Available
              await transaction.request().input("RoomID", sql.Int, prevRoomID)
                .query(`
                  UPDATE Room
                  SET Status = 'Available'
                  WHERE RoomID = @RoomID
                `);

              // Set new room to Occupied
              await transaction.request().input("RoomID", sql.Int, RoomID)
                .query(`
                  UPDATE Room
                  SET Status = 'Occupied'
                  WHERE RoomID = @RoomID
                `);
            }
          }
        }
      }

      // 3. If outpatient, update outpatient record
      if (PatientType === "Outpatient") {
        // Check if outpatient record exists
        const outpatientCheck = await transaction
          .request()
          .input("PatientID", sql.Int, id).query(`
            SELECT COUNT(*) AS count
            FROM Outpatient
            WHERE PatientID = @PatientID
          `);

        if (outpatientCheck.recordset[0].count > 0 && VisitDate) {
          // Update outpatient record
          await transaction
            .request()
            .input("PatientID", sql.Int, id)
            .input("VisitDate", sql.Date, VisitDate)
            .input("ConsultationFee", sql.Decimal(10, 2), ConsultationFee || 0)
            .query(`
              UPDATE Outpatient
              SET VisitDate = @VisitDate,
                  ConsultationFee = @ConsultationFee
              WHERE PatientID = @PatientID
            `);
        }
      }

      // Commit the transaction
      await transaction.commit();

      console.log(`Successfully updated patient ID: ${id}`);
      res.json({ message: "Patient updated successfully" });
    } catch (err) {
      // Rollback in case of error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error(`Error updating patient ${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/patients/:id", async (req, res) => {
  try {
    await sql.query(`DELETE FROM Patient WHERE PatientID=${req.params.id}`);
    res.json({ message: "Patient deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enhanced Delete Patient Endpoint
app.delete("/delete-patient/:id", async (req, res) => {
  const patientID = req.params.id;

  console.log(`Received delete request for patient ID: ${patientID}`);

  try {
    // Check if patient has associated inpatient records
    const inpatientCheck = await sql.query(`
      SELECT COUNT(*) AS count FROM Inpatient WHERE PatientID = ${patientID}
    `);

    const hasInpatientRecords = inpatientCheck.recordset[0].count > 0;

    // If patient has inpatient records, we need to handle them
    if (hasInpatientRecords) {
      console.log(
        `Patient ${patientID} has inpatient records that need handling`
      );

      // Get the room ID for potentially admitted patient
      const roomResult = await sql.query(`
        SELECT RoomID FROM Inpatient WHERE PatientID = ${patientID} AND DischargeDate IS NULL
      `);

      // If patient is currently admitted, update the room status
      if (roomResult.recordset.length > 0) {
        const roomID = roomResult.recordset[0].RoomID;
        console.log(
          `Patient ${patientID} is admitted to room ${roomID}. Updating room status...`
        );

        // Update room status to available
        await sql.query(`
          UPDATE Room SET Status = 'Available' WHERE RoomID = ${roomID}
        `);
      }

      // Create a stored procedure to handle the deletion with proper constraints
      await sql.query(`
        IF OBJECT_ID('DeletePatientWithDependencies', 'P') IS NOT NULL
          DROP PROCEDURE DeletePatientWithDependencies;
      `);

      await sql.query(`
        CREATE PROCEDURE DeletePatientWithDependencies
          @PatientID INT
        AS
        BEGIN
          BEGIN TRY
            BEGIN TRANSACTION
              -- Delete related records first
              DELETE FROM Inpatient WHERE PatientID = @PatientID;
              DELETE FROM Outpatient WHERE PatientID = @PatientID;
              DELETE FROM Appointment WHERE PatientID = @PatientID;
              DELETE FROM Billing WHERE PatientID = @PatientID;
              
              -- Then delete the patient
              DELETE FROM Patient WHERE PatientID = @PatientID;
            COMMIT TRANSACTION
          END TRY
          BEGIN CATCH
            ROLLBACK TRANSACTION
            -- Return error info
            SELECT 
              ERROR_NUMBER() AS ErrorNumber,
              ERROR_MESSAGE() AS ErrorMessage;
          END CATCH
        END
      `);

      // Execute the stored procedure
      const execResult = await sql.query(`
        EXEC DeletePatientWithDependencies @PatientID = ${patientID};
      `);

      // Check if there was an error
      if (
        execResult.recordset &&
        execResult.recordset.length > 0 &&
        execResult.recordset[0].ErrorNumber
      ) {
        throw new Error(execResult.recordset[0].ErrorMessage);
      }

      console.log(
        `Successfully deleted patient ID: ${patientID} using stored procedure`
      );
      res.json({ message: "Patient deleted successfully" });
    } else {
      // No inpatient records, can directly delete
      console.log(
        `Patient ${patientID} has no inpatient records, proceeding with direct deletion`
      );

      // Delete related records first
      await sql.query(`DELETE FROM Outpatient WHERE PatientID = ${patientID}`);
      await sql.query(`DELETE FROM Appointment WHERE PatientID = ${patientID}`);
      await sql.query(`DELETE FROM Billing WHERE PatientID = ${patientID}`);

      // Delete the patient
      const deleteResult = await sql.query(
        `DELETE FROM Patient WHERE PatientID = ${patientID}`
      );

      if (deleteResult.rowsAffected[0] === 0) {
        return res
          .status(404)
          .json({ error: "Patient not found or could not be deleted" });
      }

      console.log(`Successfully deleted patient ID: ${patientID}`);
      res.json({ message: "Patient deleted successfully" });
    }
  } catch (err) {
    console.error(`Error deleting patient ${patientID}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Room Allotment
app.get("/rooms", async (req, res) => {
  try {
    const result = await sql.query(
      "SELECT * FROM Room WHERE Status = 'Available'"
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/appointments/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deleteResult = await sql.query(
      `DELETE FROM Appointment WHERE AppointmentID = ${id}`
    );

    // Check if rows were deleted
    if (deleteResult.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Reset ID if no records exist
    await sql.query(
      "DECLARE @maxID INT; SELECT @maxID = MAX(AppointmentID) FROM Appointment; IF @maxID IS NULL SET @maxID = 0; DBCC CHECKIDENT ('Appointment', RESEED, @maxID);"
    );

    res.json({ message: "Appointment deleted successfully and ID reset" });
  } catch (err) {
    console.error("Error deleting appointment:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/admit", async (req, res) => {
  const {
    Name,
    PhoneNumber,
    Gender,
    Age,
    PatientType,
    RoomID,
    DoctorID,
    VisitDate,
    ConsultationFee,
  } = req.body;

  try {
    // First, insert the patient into the Patient table
    const result = await sql.query(
      `INSERT INTO Patient (Name, PhoneNumber, Gender, Age, PatientType) OUTPUT INSERTED.PatientID VALUES ('${Name}', '${PhoneNumber}', '${Gender}', ${Age}, '${PatientType}')`
    );

    const patientID = result.recordset[0].PatientID;

    // Based on PatientType, insert into the correct table (Inpatient or Outpatient)
    if (PatientType === "Inpatient") {
      await sql.query(
        `INSERT INTO Inpatient (PatientID, RoomID, DoctorID, AdmissionDate, PatientType) VALUES (${patientID}, ${RoomID}, ${DoctorID}, GETDATE(), '${PatientType}')`
      );
      await sql.query(
        `UPDATE Room SET Status='Occupied' WHERE RoomID=${RoomID}`
      );
    } else if (PatientType === "Outpatient") {
      const formattedVisitDate = new Date(VisitDate)
        .toISOString()
        .split("T")[0];
      await sql.query(
        `INSERT INTO Outpatient (PatientID, VisitDate, PatientType, ConsultationFee) VALUES (${patientID}, '${formattedVisitDate}', '${PatientType}', ${ConsultationFee})`
      );
    }

    res.json({ message: "Patient admitted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/discharge/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await sql.query(
      `UPDATE Inpatient SET DischargeDate=GETDATE() WHERE PatientID=${id}`
    );
    await sql.query(
      `UPDATE Room SET Status='Available' WHERE RoomID = (SELECT RoomID FROM Inpatient WHERE PatientID=${id})`
    );
    res.json({ message: "Patient discharged" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Updated endpoint for occupied rooms - ensures DISTINCT rooms
app.get("/bookedrooms", async (req, res) => {
  try {
    // Use DISTINCT to ensure no duplicate rooms
    const result = await sql.query(`
      SELECT DISTINCT r.RoomID, r.RoomType, r.CostPerDay, r.Status, 
             r.FloorNumber, r.Capacity, p.PatientID, p.Name AS PatientName 
      FROM Room r 
      JOIN Inpatient i ON r.RoomID = i.RoomID
      JOIN Patient p ON i.PatientID = p.PatientID
      WHERE r.Status = 'Occupied' AND i.DischargeDate IS NULL
      ORDER BY r.RoomID
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching booked rooms:", err);
    res.status(500).json({ error: err.message });
  }
});

// Appointments API endpoints
app.get("/appointments", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT a.*, p.Name as PatientName, d.Name as DoctorName 
      FROM Appointment a
      JOIN Patient p ON a.PatientID = p.PatientID
      JOIN Doctor d ON a.DoctorID = d.EmployeeID
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/appointments", async (req, res) => {
  const { PatientID, DoctorID, Date, AppointmentTime, Reason, Status } =
    req.body;
  try {
    await sql.query(`
      INSERT INTO Appointment (PatientID, DoctorID, Date, AppointmentTime, Reason, Status)
      VALUES (${PatientID}, ${DoctorID}, '${Date}', '${AppointmentTime}', '${Reason}', '${Status}')
    `);
    res.json({ message: "Appointment created successfully" });
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/appointments/:id/status", async (req, res) => {
  const { id } = req.params;
  const { Status } = req.body;
  try {
    await sql.query(`
      UPDATE Appointment 
      SET Status = '${Status}'
      WHERE AppointmentID = ${id}
    `);
    res.json({ message: "Appointment status updated successfully" });
  } catch (err) {
    console.error("Error updating appointment status:", err);
    res.status(500).json({ error: err.message });
  }
});

// Pharmacy / Medications API endpoints
app.get("/medications", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT m.*, man.Name as ManufacturerName
      FROM Medication m
      JOIN Manufacturer man ON m.ManufacturerID = man.ManufacturerID
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching medications:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/inventory", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT i.*, m.Name as MedicationName, m.ExpiryDate
      FROM Inventory i
      JOIN Medication m ON i.MedicationID = m.MedicationID
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/manufacturers", async (req, res) => {
  try {
    const result = await sql.query(`SELECT * FROM Manufacturer`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching manufacturers:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/pharmacies", async (req, res) => {
  try {
    const result = await sql.query(`SELECT * FROM Pharmacy`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching pharmacies:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/medications", async (req, res) => {
  const {
    Name,
    Description,
    Price,
    ExpiryDate,
    PharmacyID,
    ManufacturerID,
    Quantity,
  } = req.body;

  try {
    // Start a transaction
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // Insert into Medication table
      const medResult = await transaction
        .request()
        .input("Name", sql.VarChar, Name)
        .input("Description", sql.Text, Description || "")
        .input("Price", sql.Decimal(10, 2), Price)
        .input("ExpiryDate", sql.Date, ExpiryDate)
        .input("PharmacyID", sql.Int, PharmacyID)
        .input("ManufacturerID", sql.Int, ManufacturerID).query(`
          INSERT INTO Medication (PharmacyID, ManufacturerID, Name, Description, Price, ExpiryDate)
          OUTPUT INSERTED.MedicationID
          VALUES (@PharmacyID, @ManufacturerID, @Name, @Description, @Price, @ExpiryDate)
        `);

      const medicationID = medResult.recordset[0].MedicationID;

      // Insert into Inventory table
      await transaction
        .request()
        .input("PharmacyID", sql.Int, PharmacyID)
        .input("MedicationID", sql.Int, medicationID)
        .input("Quantity", sql.Int, Quantity).query(`
          INSERT INTO Inventory (PharmacyID, MedicationID, Quantity, LastUpdated)
          VALUES (@PharmacyID, @MedicationID, @Quantity, GETDATE())
        `);

      // Commit the transaction
      await transaction.commit();

      res.json({
        message: "Medication added successfully",
        medicationID,
      });
    } catch (err) {
      // Rollback in case of error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error adding medication:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/inventory/:id", async (req, res) => {
  const { id } = req.params;
  const { quantity, expiryDate } = req.body;

  try {
    // Start a transaction
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // Update inventory quantity
      await transaction
        .request()
        .input("InventoryID", sql.Int, id)
        .input("Quantity", sql.Int, quantity).query(`
          UPDATE Inventory
          SET Quantity = @Quantity, LastUpdated = GETDATE()
          WHERE InventoryID = @InventoryID
        `);

      // Update expiry date if provided
      if (expiryDate) {
        // Get the medication ID first
        const medResult = await transaction
          .request()
          .input("InventoryID", sql.Int, id).query(`
            SELECT MedicationID FROM Inventory WHERE InventoryID = @InventoryID
          `);

        const medicationID = medResult.recordset[0].MedicationID;

        // Update the expiry date
        await transaction
          .request()
          .input("MedicationID", sql.Int, medicationID)
          .input("ExpiryDate", sql.Date, expiryDate).query(`
            UPDATE Medication
            SET ExpiryDate = @ExpiryDate
            WHERE MedicationID = @MedicationID
          `);
      }

      // Commit the transaction
      await transaction.commit();

      res.json({
        message: "Inventory updated successfully",
      });
    } catch (err) {
      // Rollback in case of error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error updating inventory:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/medications/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Start a transaction
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // First delete from Inventory
      await transaction.request().input("MedicationID", sql.Int, id).query(`
          DELETE FROM Inventory WHERE MedicationID = @MedicationID
        `);

      // Then delete from Medication
      await transaction.request().input("MedicationID", sql.Int, id).query(`
          DELETE FROM Medication WHERE MedicationID = @MedicationID
        `);

      // Commit the transaction
      await transaction.commit();

      res.json({
        message: "Medication deleted successfully",
      });
    } catch (err) {
      // Rollback in case of error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error deleting medication:", err);
    res.status(500).json({ error: err.message });
  }
});

// Billing API endpoints
app.get("/billing", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT b.*, p.Name as PatientName
      FROM Billing b
      JOIN Patient p ON b.PatientID = p.PatientID
      ORDER BY b.BillingID DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching billing records:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/billing", async (req, res) => {
  const {
    PatientID,
    PaymentMethodID,
    ServiceCharges,
    MedicationCharges,
    RoomCharges,
    ConsultationFee,
    TotalAmount,
    AmountPaid,
    Status,
  } = req.body;

  try {
    // Start a transaction
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // Insert billing record
      const result = await transaction
        .request()
        .input("PatientID", sql.Int, PatientID)
        .input("PaymentMethodID", sql.Int, PaymentMethodID || 1)
        .input("ServiceCharges", sql.Decimal(10, 2), ServiceCharges || 0)
        .input("MedicationCharges", sql.Decimal(10, 2), MedicationCharges || 0)
        .input("RoomCharges", sql.Decimal(10, 2), RoomCharges || 0)
        .input("ConsultationFee", sql.Decimal(10, 2), ConsultationFee || 0)
        .input("TotalAmount", sql.Decimal(10, 2), TotalAmount || 0)
        .input("AmountPaid", sql.Decimal(10, 2), AmountPaid || 0)
        .input("Status", sql.VarChar(20), Status || "Unpaid").query(`
          INSERT INTO Billing (
            PatientID, 
            PaymentMethodID, 
            ServiceCharges, 
            MedicationCharges, 
            RoomCharges,
            ConsultationFee,
            TotalAmount,
            AmountPaid,
            Status
          )
          OUTPUT INSERTED.BillingID
          VALUES (
            @PatientID, 
            @PaymentMethodID, 
            @ServiceCharges, 
            @MedicationCharges, 
            @RoomCharges,
            @ConsultationFee,
            @TotalAmount,
            @AmountPaid,
            @Status
          )
        `);

      const billingID = result.recordset[0].BillingID;

      // Commit the transaction
      await transaction.commit();

      res.json({
        message: "Billing record created successfully",
        billingID,
      });
    } catch (err) {
      // Rollback in case of error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error creating billing record:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/billing/:id", async (req, res) => {
  const { id } = req.params;
  const { Status, AmountPaid } = req.body;

  try {
    // Start a transaction
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // Update billing record
      await transaction
        .request()
        .input("BillingID", sql.Int, id)
        .input("Status", sql.VarChar(20), Status)
        .input("AmountPaid", sql.Decimal(10, 2), AmountPaid || 0).query(`
          UPDATE Billing 
          SET Status = @Status, 
              AmountPaid = @AmountPaid
          WHERE BillingID = @BillingID
        `);

      // Commit the transaction
      await transaction.commit();

      res.json({
        message: "Billing record updated successfully",
      });
    } catch (err) {
      // Rollback in case of error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error updating billing record:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/billing/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Start a transaction
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // Delete billing record
      await transaction.request().input("BillingID", sql.Int, id).query(`
          DELETE FROM Billing WHERE BillingID = @BillingID
        `);

      // Commit the transaction
      await transaction.commit();

      res.json({
        message: "Billing record deleted successfully",
      });
    } catch (err) {
      // Rollback in case of error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error deleting billing record:", err);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get inpatient room information for billing
app.get("/inpatient-rooms", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT i.PatientID, i.AdmissionDate, i.DischargeDate, r.RoomID, r.CostPerDay
      FROM Inpatient i
      JOIN Room r ON i.RoomID = r.RoomID
      WHERE i.DischargeDate IS NULL
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching inpatient rooms:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/maintenance-rooms", async (req, res) => {
  try {
    const result = await sql.query(`
      SELECT * FROM Room 
      WHERE Status = 'Under Maintenance'
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching maintenance rooms:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5001, () => console.log("Server running on port 5001"));
