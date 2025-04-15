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

  useEffect(() => {
    fetchRooms();
    fetchPatients();
    fetchDoctors();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);

      // Fetch available rooms
      const availableResponse = await axios.get("http://localhost:5001/rooms");
      setAvailableRooms(availableResponse.data);

      // Fetch occupied rooms
      const occupiedResponse = await axios.get(
        "http://localhost:5001/bookedrooms"
      );
      setOccupiedRooms(occupiedResponse.data);

      // For maintenance rooms, we need to modify the API or add this endpoint
      // This is just a placeholder - you'll need to implement the actual endpoint
      try {
        const maintenanceResponse = await axios.get(
          "http://localhost:5001/maintenance-rooms"
        );
        setMaintenanceRooms(maintenanceResponse.data);
      } catch (error) {
        // If the endpoint doesn't exist yet, we'll use empty array for now
        setMaintenanceRooms([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get("http://localhost:5001/patients");
      // Filter to get only outpatients without a room
      const eligiblePatients = response.data.filter(
        (patient) =>
          patient.PatientType === "Outpatient" ||
          (patient.PatientType === "Inpatient" && !patient.RoomID)
      );
      setPatients(eligiblePatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
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

  const handleAllotFormChange = (e) => {
    setAllotFormData({
      ...allotFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAllotRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5001/admit", {
        PatientID: allotFormData.PatientID,
        RoomID: allotFormData.RoomID,
        DoctorID: allotFormData.DoctorID,
        AdmissionDate: allotFormData.AdmissionDate,
      });

      fetchRooms();
      setShowAllotForm(false);
      setAllotFormData({
        PatientID: "",
        RoomID: "",
        DoctorID: "",
        AdmissionDate: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Error allotting room:", error);
    }
  };

  const handleDischargePatient = async (patientID) => {
    try {
      await axios.post(`http://localhost:5001/discharge/${patientID}`);
      fetchRooms();
    } catch (error) {
      console.error("Error discharging patient:", error);
    }
  };

  const renderRoomCards = () => {
    let roomsToShow = [];

    if (selectedTab === "available") {
      roomsToShow = availableRooms;
    } else if (selectedTab === "occupied") {
      roomsToShow = occupiedRooms;
    } else {
      roomsToShow = maintenanceRooms;
    }

    if (roomsToShow.length === 0) {
      return (
        <div className="no-rooms">
          <p>No {selectedTab} rooms found</p>
        </div>
      );
    }

    return (
      <div className="room-cards">
        {roomsToShow.map((room) => (
          <div
            key={room.RoomID}
            className={`room-card ${
              selectedTab === "occupied"
                ? "occupied"
                : selectedTab === "maintenance"
                ? "maintenance"
                : ""
            }`}
          >
            <div className="room-header">
              <h3>Room {room.RoomID}</h3>
              <span className={`room-status ${selectedTab}`}>
                {selectedTab === "available"
                  ? "Available"
                  : selectedTab === "occupied"
                  ? "Occupied"
                  : "Maintenance"}
              </span>
            </div>
            <div className="room-details">
              <p>
                <strong>Type:</strong> {room.RoomType}
              </p>
              <p>
                <strong>Cost per Day:</strong> ${room.CostPerDay}
              </p>
              <p>
                <strong>Floor:</strong> {room.FloorNumber}
              </p>
              <p>
                <strong>Capacity:</strong> {room.Capacity}
              </p>

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
