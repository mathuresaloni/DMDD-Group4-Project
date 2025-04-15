import React, { useState, useEffect } from "react";
import axios from "axios";
import "./PatientManagement.css";

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inpatients");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    Name: "",
    PhoneNumber: "",
    Gender: "",
    Email: "",
    Age: "",
    Address: "",
    EmergencyContact: "",
    PatientType: "Inpatient",
    RoomID: "",
    DoctorID: "",
    VisitDate: "",
    ConsultationFee: "",
  });

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5001/patients");
      setPatients(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await axios.get("http://localhost:5001/doctors");
      setDoctors(response.data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5001/admit", formData);
      fetchPatients();
      setFormData({
        Name: "",
        PhoneNumber: "",
        Gender: "",
        Email: "",
        Age: "",
        Address: "",
        EmergencyContact: "",
        PatientType: "Inpatient",
        RoomID: "",
        DoctorID: "",
        VisitDate: "",
        ConsultationFee: "",
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding patient:", error);
    }
  };

  const handleDeletePatient = async (patientID) => {
    try {
      await axios.delete(`http://localhost:5001/delete-patient/${patientID}`);
      fetchPatients();
    } catch (error) {
      console.error("Error deleting patient:", error);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    if (activeTab === "inpatients") {
      return patient.PatientType === "Inpatient";
    } else {
      return patient.PatientType === "Outpatient";
    }
  });

  return (
    <div className="patient-management">
      <div className="section-header">
        <h2>Patient Management</h2>
        <button className="add-button" onClick={() => setShowAddForm(true)}>
          + Add New Patient
        </button>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "inpatients" ? "active" : ""}
          onClick={() => setActiveTab("inpatients")}
        >
          Inpatients
        </button>
        <button
          className={activeTab === "outpatients" ? "active" : ""}
          onClick={() => setActiveTab("outpatients")}
        >
          Outpatients
        </button>
      </div>

      {showAddForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Patient</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="Name"
                    value={formData.Name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    name="PhoneNumber"
                    value={formData.PhoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="Gender"
                    value={formData.Gender}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="Email"
                    value={formData.Email}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    name="Age"
                    value={formData.Age}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    name="EmergencyContact"
                    value={formData.EmergencyContact}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="Address"
                    value={formData.Address}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Patient Type</label>
                  <select
                    name="PatientType"
                    value={formData.PatientType}
                    onChange={handleChange}
                    required
                  >
                    <option value="Inpatient">Inpatient</option>
                    <option value="Outpatient">Outpatient</option>
                  </select>
                </div>

                {formData.PatientType === "Inpatient" && (
                  <>
                    <div className="form-group">
                      <label>Room ID</label>
                      <input
                        type="text"
                        name="RoomID"
                        value={formData.RoomID}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Doctor</label>
                      <select
                        name="DoctorID"
                        value={formData.DoctorID}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Doctor</option>
                        {doctors.map((doctor) => (
                          <option
                            key={doctor.EmployeeID}
                            value={doctor.EmployeeID}
                          >
                            Dr. {doctor.Name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {formData.PatientType === "Outpatient" && (
                  <>
                    <div className="form-group">
                      <label>Visit Date</label>
                      <input
                        type="date"
                        name="VisitDate"
                        value={formData.VisitDate}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Consultation Fee</label>
                      <input
                        type="number"
                        name="ConsultationFee"
                        value={formData.ConsultationFee}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading patients...</div>
      ) : (
        <div className="patients-table-container">
          <table className="patients-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>{activeTab === "inpatients" ? "Room" : "Visit Date"}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.PatientID}>
                    <td>{patient.PatientID}</td>
                    <td>{patient.Name}</td>
                    <td>{patient.Age}</td>
                    <td>{patient.Gender}</td>
                    <td>{patient.PhoneNumber}</td>
                    <td>
                      {activeTab === "inpatients"
                        ? patient.RoomID || "N/A"
                        : patient.VisitDate || "N/A"}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="view-btn">View</button>
                        <button className="edit-btn">Edit</button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeletePatient(patient.PatientID)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    No{" "}
                    {activeTab === "inpatients" ? "inpatients" : "outpatients"}{" "}
                    found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PatientManagement;
