const express = require("express");
const bodyParser = require("body-parser");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:3000" }));

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

app.listen(5001, () => console.log("Server running on port 5001"));
