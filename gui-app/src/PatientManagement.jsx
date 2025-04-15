import React, { useState, useEffect } from "react";
import axios from "axios";
import "./PatientManagement.css";

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inpatients");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
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

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
    setShowViewModal(true);
  };

  const handleEditPatient = (patient) => {
    setSelectedPatient(patient);
    // Populate form data with patient details
    setFormData({
      PatientID: patient.PatientID,
      Name: patient.Name || "",
      PhoneNumber: patient.PhoneNumber || "",
      Gender: patient.Gender || "",
      Email: patient.Email || "",
      Age: patient.Age || "",
      Address: patient.Address || "",
      EmergencyContact: patient.EmergencyContact || "",
      PatientType: patient.PatientType || "Inpatient",
      RoomID: patient.RoomID || "",
      DoctorID: patient.DoctorID || "",
      VisitDate: patient.VisitDate ? patient.VisitDate.split('T')[0] : "",
      ConsultationFee: patient.ConsultationFee || "",
    });
    setShowEditForm(true);
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`http://localhost:5001/patients/${formData.PatientID}`, formData);
      alert("Patient updated successfully!");
      fetchPatients();
      setShowEditForm(false);
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
    } catch (error) {
      console.error("Error updating patient:", error);
      alert(`Error updating patient: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async (patientID) => {
    // Confirm deletion with the user
    if (!window.confirm(`Are you sure you want to delete patient #${patientID}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      console.log(`Attempting to delete patient ID: ${patientID}`);
      
      // Make the delete request
      const response = await axios.delete(`http://localhost:5001/delete-patient/${patientID}`);
      console.log("Delete response:", response.data);
      
      // Show success message
      alert("Patient deleted successfully!");
      
      // Refresh the patient list
      await fetchPatients();
    } catch (error) {
      console.error("Error deleting patient:", error);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.error || error.message;
      alert(`Error deleting patient: ${errorMessage}`);
    } finally {
      setLoading(false);
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

      {/* Add Patient Form */}
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

      {/* View Patient Modal */}
      {showViewModal && selectedPatient && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Patient Details</h3>
              <button
                className="close-btn"
                onClick={() => setShowViewModal(false)}
              >
                ×
              </button>
            </div>
            <div className="patient-details">
              <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{selectedPatient.PatientID}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{selectedPatient.Name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Age:</span>
                <span className="detail-value">{selectedPatient.Age}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Gender:</span>
                <span className="detail-value">{selectedPatient.Gender}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{selectedPatient.PhoneNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{selectedPatient.Email || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{selectedPatient.Address || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Emergency Contact:</span>
                <span className="detail-value">{selectedPatient.EmergencyContact || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Patient Type:</span>
                <span className="detail-value">{selectedPatient.PatientType}</span>
              </div>
              {selectedPatient.PatientType === "Inpatient" && (
                <div className="detail-row">
                  <span className="detail-label">Room ID:</span>
                  <span className="detail-value">{selectedPatient.RoomID || "Not Assigned"}</span>
                </div>
              )}
              {selectedPatient.PatientType === "Outpatient" && (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Visit Date:</span>
                    <span className="detail-value">
                      {selectedPatient.VisitDate 
                        ? new Date(selectedPatient.VisitDate).toLocaleDateString() 
                        : "N/A"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Consultation Fee:</span>
                    <span className="detail-value">
                      ${selectedPatient.ConsultationFee || "0"}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="close-modal-btn"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Form */}
      {showEditForm && selectedPatient && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Patient</h3>
              <button
                className="close-btn"
                onClick={() => setShowEditForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdatePatient}>
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
                {/* Note: We usually don't allow changing patient type once created */}
                <div className="form-group">
                  <label>Patient Type</label>
                  <input
                    type="text"
                    value={formData.PatientType}
                    disabled
                  />
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
                      />
                    </div>
                    <div className="form-group">
                      <label>Doctor</label>
                      <select
                        name="DoctorID"
                        value={formData.DoctorID}
                        onChange={handleChange}
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
                      />
                    </div>
                    <div className="form-group">
                      <label>Consultation Fee</label>
                      <input
                        type="number"
                        name="ConsultationFee"
                        value={formData.ConsultationFee}
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowEditForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Patient
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
                        : patient.VisitDate 
                          ? new Date(patient.VisitDate).toLocaleDateString() 
                          : "N/A"}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="view-btn"
                          onClick={() => handleViewPatient(patient)}
                        >
                          View
                        </button>
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditPatient(patient)}
                        >
                          Edit
                        </button>
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