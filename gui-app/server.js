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
    encrypt: true, // Use encryption if required
    trustServerCertificate: true, // Change based on your setup
  },
};

sql.connect(dbConfig, (err) => {
  if (err) console.error("Database connection failed", err);
  else console.log("SQL Server Connected");
});

// CRUD Operations for Patients
app.get("/patients", async (req, res) => {
  try {
    const result = await sql.query("SELECT * FROM Patient");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.put("/patients/:id", async (req, res) => {
  const { id } = req.params;
  const { Name, PhoneNumber, Gender, Age } = req.body;
  try {
    await sql.query(
      `UPDATE Patient SET Name='${Name}', PhoneNumber='${PhoneNumber}', Gender='${Gender}', Age=${Age} WHERE PatientID=${id}`
    );
    res.json({ message: "Patient updated successfully" });
  } catch (err) {
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

app.delete("/delete-patient/:id", async (req, res) => {
  const patientID = req.params.id;
  try {
    await sql.query(`DELETE FROM Patient WHERE PatientID = ${patientID}`);
    res.json({ message: "Patient deleted successfully" });
  } catch (err) {
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

app.get("/bookedrooms", async (req, res) => {
  try {
    const result = await sql.query(
      `SELECT r.RoomID, r.RoomType, r.CostPerDay, r.Status, p.Name AS PatientName 
       FROM Room r 
       JOIN Inpatient i ON r.RoomID = i.RoomID
       JOIN Patient p ON i.PatientID = p.PatientID
       WHERE r.Status = 'Occupied'`
    );
    res.json(result.recordset);
  } catch (err) {
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
    const result = await sql.query(`
      INSERT INTO Billing (
        PatientID, 
        PaymentMethodID, 
        ServiceCharges, 
        MedicationCharges, 
        RoomCharges,
        ConsultationFee,
        TotalAmount,
        AmountPaid
      )
      OUTPUT INSERTED.BillingID
      VALUES (
        ${PatientID}, 
        ${PaymentMethodID}, 
        ${ServiceCharges}, 
        ${MedicationCharges}, 
        ${RoomCharges},
        ${ConsultationFee},
        ${TotalAmount},
        ${AmountPaid}
      )
    `);

    const billingID = result.recordset[0].BillingID;

    res.json({
      message: "Billing record created successfully",
      billingID,
    });
  } catch (err) {
    console.error("Error creating billing record:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/billing/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await sql.query(`
      DELETE FROM Billing WHERE BillingID = ${id}
    `);

    res.json({
      message: "Billing record deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting billing record:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5001, () => console.log("Server running on port 5001"));
