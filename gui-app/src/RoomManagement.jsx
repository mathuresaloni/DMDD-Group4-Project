import React, { useState, useEffect } from "react";
import axios from "axios";
import "./RoomManagement.css";

const RoomManagement = () => {
  const [availableRooms, setAvailableRooms] = useState([]);
  const [occupiedRooms, setOccupiedRooms] = useState([]);
  const [maintenanceRooms, setMaintenanceRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("available");
  const [showAllotForm, setShowAllotForm] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [allotFormData, setAllotFormData] = useState({
    PatientID: "",
    RoomID: "",
    DoctorID: "",
    AdmissionDate: new Date().toISOString().split("T")[0],
  });

  // Simple function to load all data
  const loadAllData = () => {
    setLoading(true);
    Promise.all([
      fetchAvailableRooms(),
      fetchOccupiedRooms(),
      fetchMaintenanceRooms(),
      fetchPatients(),
      fetchDoctors()
    ])
    .then(() => setLoading(false))
    .catch(error => {
      console.error("Error loading data:", error);
      setLoading(false);
    });
  };

  // Fetch each type of room from separate endpoints
  const fetchAvailableRooms = async () => {
    try {
      const response = await axios.get("http://localhost:5001/rooms");
      setAvailableRooms(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching available rooms:", error);
      setAvailableRooms([]);
      return [];
    }
  };

  const fetchOccupiedRooms = async () => {
    try {
      const response = await axios.get("http://localhost:5001/bookedrooms");
      
      // Create a Map to store unique rooms by RoomID
      const uniqueRoomsMap = new Map();
      
      // Process each room to ensure uniqueness
      response.data.forEach(room => {
        // Only add the room if it's not already in our Map
        if (!uniqueRoomsMap.has(room.RoomID)) {
          uniqueRoomsMap.set(room.RoomID, room);
        }
      });
      
      // Convert Map back to array
      const uniqueRooms = Array.from(uniqueRoomsMap.values());
      
      console.log("Unique occupied rooms:", uniqueRooms);
      setOccupiedRooms(uniqueRooms);
      return uniqueRooms;
    } catch (error) {
      console.error("Error fetching occupied rooms:", error);
      setOccupiedRooms([]);
      return [];
    }
  };

  const fetchMaintenanceRooms = async () => {
    try {
      const response = await axios.get("http://localhost:5001/maintenance-rooms");
      setMaintenanceRooms(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching maintenance rooms:", error);
      setMaintenanceRooms([]);
      return [];
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get("http://localhost:5001/patients");
      // Only show patients who can be admitted (not already admitted inpatients)
      const eligiblePatients = response.data.filter(
        (patient) =>
          (patient.PatientType === "Inpatient" && !patient.RoomID) || 
          patient.PatientType === "Outpatient"
      );
      setPatients(eligiblePatients);
      return eligiblePatients;
    } catch (error) {
      console.error("Error fetching patients:", error);
      setPatients([]);
      return [];
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await axios.get("http://localhost:5001/doctors");
      setDoctors(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setDoctors([]);
      return [];
    }
  };

  useEffect(() => {
    // Load all data when component mounts
    loadAllData();
  }, []);

  const handleAllotFormChange = (e) => {
    setAllotFormData({
      ...allotFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAllotRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log("Allotment data:", allotFormData);
      
      // Get the patient data first to include in the request
      const patientResponse = await axios.get(`http://localhost:5001/patients?id=${allotFormData.PatientID}`);
      const patientData = patientResponse.data.find(p => p.PatientID === Number(allotFormData.PatientID));
      
      if (!patientData) {
        throw new Error("Patient data not found");
      }
      
      // Create admission data with all required fields
      const admitData = {
        // Pass existing patient ID
        PatientID: allotFormData.PatientID,
        
        // Include patient data
        Name: patientData.Name,
        PhoneNumber: patientData.PhoneNumber,
        Gender: patientData.Gender,
        Age: patientData.Age,
        
        // Required fields for admission
        PatientType: "Inpatient",
        RoomID: allotFormData.RoomID,
        DoctorID: allotFormData.DoctorID,
        AdmissionDate: allotFormData.AdmissionDate
      };
      
      console.log("Sending data to /admit:", admitData);
      
      const response = await axios.post("http://localhost:5001/admit", admitData);
      console.log("Admit response:", response.data);
  
      // Close the form
      setShowAllotForm(false);
      
      // Reset form data
      setAllotFormData({
        PatientID: "",
        RoomID: "",
        DoctorID: "",
        AdmissionDate: new Date().toISOString().split("T")[0],
      });
      
      // Show success message if needed
      alert("Room allocated successfully!");
      
      // Reload all data
      loadAllData();
    } catch (error) {
      console.error("Error allotting room:", error);
      alert(`Error allotting room: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDischargePatient = async (patientID) => {
    if (!patientID) {
      console.error("Error: No patient ID provided for discharge");
      alert("Cannot discharge: Patient ID is missing");
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("Discharging patient:", patientID);
      
      const response = await axios.post(`http://localhost:5001/discharge/${patientID}`);
      console.log("Discharge response:", response.data);
      
      // Show success message
      alert("Patient discharged successfully!");
      
      // Reload all data
      loadAllData();
    } catch (error) {
      console.error("Error discharging patient:", error);
      // Show error message with details
      alert(`Error discharging patient: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderRoomCards = () => {
    let roomsToShow = [];
    let statusClassName = "";
    let statusLabel = "";
    
    // Determine which rooms to show based on selected tab
    if (selectedTab === "available") {
      roomsToShow = availableRooms;
      statusClassName = "available";
      statusLabel = "Available";
    } else if (selectedTab === "occupied") {
      roomsToShow = occupiedRooms;
      statusClassName = "occupied";
      statusLabel = "Occupied";
    } else {
      roomsToShow = maintenanceRooms;
      statusClassName = "maintenance";
      statusLabel = "Under Maintenance";
    }

    if (roomsToShow.length === 0) {
      return (
        <div className="no-rooms">
          <p>No {selectedTab} rooms found</p>
        </div>
      );
    }
    
    console.log(`Rendering ${selectedTab} rooms:`, roomsToShow);

    return (
      <div className="room-cards">
        {roomsToShow.map((room) => (
          <div
            key={`${room.RoomID}-${Math.random()}`}
            className={`room-card ${statusClassName}`}
          >
            <div className="room-header">
              <h3>Room {room.RoomID}</h3>
              <span className={`room-status ${statusClassName}`}>
                {statusLabel}
              </span>
            </div>
            <div className="room-details">
              <p>
                <strong>Type:</strong> {room.RoomType}
              </p>
              <p>
                <strong>Cost per Day:</strong> ${room.CostPerDay}
              </p>
              {room.FloorNumber && (
                <p>
                  <strong>Floor:</strong> {room.FloorNumber}
                </p>
              )}
              {room.Capacity && (
                <p>
                  <strong>Capacity:</strong> {room.Capacity}
                </p>
              )}

              {selectedTab === "occupied" && (
                <div className="patient-info">
                  <p>
                    <strong>Patient:</strong> {room.PatientName || "Unknown"}
                  </p>
                  <button
                    className="discharge-btn"
                    onClick={() => handleDischargePatient(room.PatientID)}
                  >
                    Discharge Patient
                  </button>
                </div>
              )}

              {selectedTab === "available" && (
                <button
                  className="allot-btn"
                  onClick={() => {
                    setAllotFormData({
                      ...allotFormData,
                      RoomID: room.RoomID,
                    });
                    setShowAllotForm(true);
                  }}
                >
                  Allot Room
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="room-management">
      <div className="section-header">
        <h2>Room Management</h2>
        <div className="room-filters">
          <div className="room-stats">
            <div className="stat">
              <span className="stat-count">{availableRooms.length}</span>
              <span className="stat-label">Available</span>
            </div>
            <div className="stat">
              <span className="stat-count">{occupiedRooms.length}</span>
              <span className="stat-label">Occupied</span>
            </div>
            <div className="stat">
              <span className="stat-count">{maintenanceRooms.length}</span>
              <span className="stat-label">Maintenance</span>
            </div>
          </div>
        </div>
      </div>

      <div className="room-tabs">
        <button
          className={selectedTab === "available" ? "active" : ""}
          onClick={() => setSelectedTab("available")}
        >
          Available Rooms
        </button>
        <button
          className={selectedTab === "occupied" ? "active" : ""}
          onClick={() => setSelectedTab("occupied")}
        >
          Occupied Rooms
        </button>
        <button
          className={selectedTab === "maintenance" ? "active" : ""}
          onClick={() => setSelectedTab("maintenance")}
        >
          Under Maintenance
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <p>Loading rooms...</p>
        </div>
      ) : (
        renderRoomCards()
      )}

      {showAllotForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Allot Room {allotFormData.RoomID}</h3>
              <button
                className="close-btn"
                onClick={() => setShowAllotForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAllotRoom}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Patient</label>
                  <select
                    name="PatientID"
                    value={allotFormData.PatientID}
                    onChange={handleAllotFormChange}
                    required
                  >
                    <option value="">Select Patient</option>
                    {patients.map((patient) => (
                      <option key={patient.PatientID} value={patient.PatientID}>
                        {patient.Name} ({patient.PatientID})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Doctor</label>
                  <select
                    name="DoctorID"
                    value={allotFormData.DoctorID}
                    onChange={handleAllotFormChange}
                    required
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.EmployeeID} value={doctor.EmployeeID}>
                        Dr. {doctor.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Admission Date</label>
                  <input
                    type="date"
                    name="AdmissionDate"
                    value={allotFormData.AdmissionDate}
                    onChange={handleAllotFormChange}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAllotForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Confirm Allotment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;