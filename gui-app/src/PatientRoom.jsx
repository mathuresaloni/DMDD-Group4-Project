import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const PatientRoom = () => {
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookedRooms, setBookedRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [formData, setFormData] = useState({
    Name: "",
    PhoneNumber: "",
    Gender: "",
    Age: "",
    PatientType: "",
    RoomID: "",
    DoctorID: "",
    VisitDate: "",
    ConsultationFee: "",
  });

  useEffect(() => {
    fetchPatients();
    fetchRooms();
    fetchBookedRooms();
    fetchDoctors();
    fetchAppointments();
  }, []);

  const fetchPatients = async () => {
    const res = await axios.get("http://localhost:5001/patients");
    setPatients(res.data);
  };

  const fetchDoctors = async () => {
    const res = await axios.get("http://localhost:5001/doctors");
    setDoctors(res.data); // Save doctors data to state
  };

  const fetchRooms = async () => {
    const res = await axios.get("http://localhost:5001/rooms");
    setRooms(res.data);
  };

  const fetchBookedRooms = async () => {
    const res = await axios.get("http://localhost:5001/bookedrooms");
    setBookedRooms(res.data);
  };

  const fetchAppointments = async () => {
    const res = await axios.get("http://localhost:5001/appointments");
    setAppointments(res.data); // Save appointments data to state
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare the payload based on PatientType
    let payload = {
      Name: formData.Name,
      PhoneNumber: formData.PhoneNumber,
      Gender: formData.Gender,
      Age: formData.Age,
      PatientType: formData.PatientType,
    };

    if (formData.PatientType === "Inpatient") {
      payload.RoomID = formData.RoomID;
      payload.DoctorID = formData.DoctorID;
    } else if (formData.PatientType === "Outpatient") {
      payload.VisitDate = formData.VisitDate;
      payload.ConsultationFee = formData.ConsultationFee;
    }

    try {
      // Submit the data to the backend
      await axios.post("http://localhost:5001/admit", payload);

      // Refresh data after submission
      fetchPatients();
      fetchRooms();
      fetchBookedRooms();
      fetchAppointments();

      // Reset the form
      setFormData({
        Name: "",
        PhoneNumber: "",
        Gender: "",
        Age: "",
        PatientType: "",
        RoomID: "",
        DoctorID: "",
        VisitDate: "",
        ConsultationFee: "",
      });
    } catch (error) {
      console.error("Error admitting patient:", error);
    }
  };

  const handleDelete = async (patientID) => {
    await axios.delete(`http://localhost:5001/delete-patient/${patientID}`);
    fetchPatients(); // Refresh the list of patients after deletion
    fetchRooms();
    fetchBookedRooms();
    fetchAppointments();
  };

  const handleDeleteAppointment = async (appointmentID) => {
    try {
      const response = await axios.delete(`http://localhost:5001/appointments/${appointmentID}`);
      if (response.status === 200) {
        // Remove the deleted appointment from the list
        setAppointments(appointments.filter((appt) => appt.AppointmentID !== appointmentID));
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      alert("Failed to delete appointment");
    }
  };  

  return (
    <div className="container">
      <h1 className="header-title">🏥 Hospital Management System</h1>
      <div className="form-container">
        <h2 className="form-title">Admit Patient</h2>
        <form onSubmit={handleSubmit} className="patient-form">
          <input
            type="text"
            name="Name"
            placeholder="Name"
            value={formData.Name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="PhoneNumber"
            placeholder="Phone Number"
            value={formData.PhoneNumber}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="Gender"
            placeholder="Gender"
            value={formData.Gender}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="Age"
            placeholder="Age"
            value={formData.Age}
            onChange={handleChange}
            required
          />
          <select
            name="PatientType"
            value={formData.PatientType}
            onChange={handleChange}
            required
          >
            <option value="">Select Patient Type</option>
            <option value="Inpatient">Inpatient</option>
            <option value="Outpatient">Outpatient</option>
          </select>

          {/* Room Selection - Visible only for Inpatients */}
          {formData.PatientType === "Inpatient" && (
            <>
              <select
                name="RoomID"
                value={formData.RoomID}
                onChange={handleChange}
                required
              >
                <option value="">Select Room</option>
                {rooms.map((room) => (
                  <option key={room.RoomID} value={room.RoomID}>
                    Room {room.RoomID} - {room.RoomType}
                  </option>
                ))}
              </select>

              <select
                name="DoctorID"
                value={formData.DoctorID}
                onChange={handleChange}
                required
              >
                <option value="">Select Doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.EmployeeID} value={doctor.EmployeeID}>
                    Dr. {doctor.Name}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Outpatient Specific Fields */}
          {formData.PatientType === "Outpatient" && (
            <>
              <input
                type="date"
                name="VisitDate"
                placeholder="Visit Date"
                value={formData.VisitDate}
                onChange={handleChange}
                required
              />
              <input
                type="number"
                name="ConsultationFee"
                placeholder="Consultation Fee"
                value={formData.ConsultationFee}
                onChange={handleChange}
                required
              />
            </>
          )}

          <button type="submit" className="btn">
            Admit Patient
          </button>
        </form>
      </div>

      <div className="patients-container">
        <h2 className="section-title">Patients</h2>
        <ul className="patients-list">
          {patients.map((patient) => (
            <li key={patient.PatientID} className="patient-item">
              <span>
                {patient.Name} - {patient.PhoneNumber} - {patient.Gender} -{" "}
                {patient.Age} - {patient.PatientType}
              </span>
              <button
                className="delete-btn"
                onClick={() => handleDelete(patient.PatientID)}
              >
                🗑️ Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Appointments List */}
      <div className="appointments-container">
        <h2 className="section-title">Appointments</h2>
        <ul className="appointment-list">
          {appointments.map((appointment) => (
            <li key={appointment.AppointmentID} className="appointment-item">
              <span>
                Appointment ID: {appointment.AppointmentID} -{" "}
                {appointment.Date} - {appointment.AppointmentTime} -{" "}
                {appointment.Reason} - Status: {appointment.Status}
              </span>
              <button
                onClick={() => handleDeleteAppointment(appointment.AppointmentID)}
                className="delete-btn"
              >
                🗑️ Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rooms-container">
        <h2 className="section-title">Available Rooms</h2>
        <ul className="rooms-list">
          {rooms.map((room) => (
            <li key={room.RoomID} className="room-item">
              🏠 Room {room.RoomID} - {room.RoomType} - ${room.CostPerDay}/day
            </li>
          ))}
        </ul>
      </div>

      <div className="booked-rooms-container">
        <h2 className="section-title">Booked Rooms</h2>
        <ul className="rooms-list">
          {bookedRooms.map((room) => (
            <li key={room.RoomID} className="room-item booked">
              🏠 Room {room.RoomID} - {room.RoomType} - ${room.CostPerDay}/day -
              Occupied
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PatientRoom;
