import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AppointmentManagement.css";

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [formData, setFormData] = useState({
    PatientID: "",
    DoctorID: "",
    Date: "",
    AppointmentTime: "",
    Reason: "",
    Status: "Scheduled",
  });

  // For the calendar view
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState("weekly"); // "weekly" or "monthly"

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5001/appointments");
      setAppointments(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get("http://localhost:5001/patients");
      setPatients(response.data);
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5001/appointments", formData);
      fetchAppointments();
      setFormData({
        PatientID: "",
        DoctorID: "",
        Date: "",
        AppointmentTime: "",
        Reason: "",
        Status: "Scheduled",
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding appointment:", error);
      alert("Failed to create appointment. Please try again.");
    }
  };

  const handleStatusChange = async (appointmentID, newStatus) => {
    try {
      await axios.put(
        `http://localhost:5001/appointments/${appointmentID}/status`,
        {
          Status: newStatus,
        }
      );

      // Update local state without refetching all appointments
      setAppointments(
        appointments.map((appointment) =>
          appointment.AppointmentID === appointmentID
            ? { ...appointment, Status: newStatus }
            : appointment
        )
      );
    } catch (error) {
      console.error("Error updating appointment status:", error);
      alert("Failed to update appointment status. Please try again.");
    }
  };

  const handleDeleteAppointment = async (appointmentID) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      try {
        await axios.delete(
          `http://localhost:5001/appointments/${appointmentID}`
        );
        // Remove the deleted appointment from state
        setAppointments(
          appointments.filter(
            (appointment) => appointment.AppointmentID !== appointmentID
          )
        );
      } catch (error) {
        console.error("Error deleting appointment:", error);
        alert("Failed to delete appointment. Please try again.");
      }
    }
  };

  // Calculate appointment statistics
  const scheduledCount = appointments.filter(
    (app) => app.Status === "Scheduled"
  ).length;
  const completedCount = appointments.filter(
    (app) => app.Status === "Completed"
  ).length;
  const cancelledCount = appointments.filter(
    (app) => app.Status === "Cancelled"
  ).length;

  // Filter appointments based on search term, status, and date
  const filteredAppointments = appointments.filter((appointment) => {
    // Find the patient and doctor names for search
    const patient = patients.find((p) => p.PatientID === appointment.PatientID);
    const doctor = doctors.find((d) => d.EmployeeID === appointment.DoctorID);

    const patientName = patient ? patient.Name.toLowerCase() : "";
    const doctorName = doctor ? doctor.Name.toLowerCase() : "";

    // Check if the appointment matches the search term
    const searchMatch =
      searchTerm === "" ||
      patientName.includes(searchTerm.toLowerCase()) ||
      doctorName.includes(searchTerm.toLowerCase()) ||
      (appointment.Reason &&
        appointment.Reason.toLowerCase().includes(searchTerm.toLowerCase()));

    // Check if the appointment matches the status filter
    const statusMatch =
      statusFilter === "all" || appointment.Status === statusFilter;

    // Check if the appointment matches the date filter
    const dateMatch =
      dateFilter === "" || appointment.Date.includes(dateFilter);

    return searchMatch && statusMatch && dateMatch;
  });

  // Format appointment time for display
  const formatTime = (timeString) => {
    if (!timeString) return "";

    try {
      // Parse the time string (assuming format is HH:MM:SS)
      const [hours, minutes] = timeString.split(":");
      const time = new Date();
      time.setHours(parseInt(hours, 10));
      time.setMinutes(parseInt(minutes, 10));

      return time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return timeString; // Return original if parsing fails
    }
  };

  // Helper function to get patient name by ID
  const getPatientName = (patientID) => {
    const patient = patients.find((p) => p.PatientID === patientID);
    return patient ? patient.Name : "Unknown Patient";
  };

  // Helper function to get doctor name by ID
  const getDoctorName = (doctorID) => {
    const doctor = doctors.find((d) => d.EmployeeID === doctorID);
    return doctor ? `Dr. ${doctor.Name}` : "Unknown Doctor";
  };

  // Calendar view functions
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const getPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const getNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const getPreviousWeek = () => {
    const newDate = new Date(currentMonth);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentMonth(newDate);
  };

  const getNextWeek = () => {
    const newDate = new Date(currentMonth);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentMonth(newDate);
  };

  const generateMonthlyCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    const days = [];

    // Add days from previous month
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Add days from next month until we have 42 days (6 weeks)
    const daysToAdd = 42 - days.length;
    for (let i = 1; i <= daysToAdd; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const generateWeeklyCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = currentMonth.getDate();

    // Get the current day of the week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = currentMonth.getDay();

    // Calculate the first day of the week (Sunday)
    const firstDayOfWeek = new Date(year, month, date - dayOfWeek);

    const days = [];

    // Generate 7 days for the week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(firstDayOfWeek);
      currentDate.setDate(firstDayOfWeek.getDate() + i);

      days.push({
        date: currentDate,
        isCurrentMonth: currentDate.getMonth() === month,
      });
    }

    return days;
  };

  const getAppointmentsForDate = (date) => {
    const formattedDate = date.toISOString().split("T")[0];

    return appointments.filter((appointment) => {
      // Convert the appointment date from your database format to a comparable format
      const appointmentDate = new Date(appointment.Date)
        .toISOString()
        .split("T")[0];
      return appointmentDate === formattedDate;
    });
  };

  const renderCalendar = () => {
    const days =
      viewMode === "monthly"
        ? generateMonthlyCalendar()
        : generateWeeklyCalendar();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthName = currentMonth.toLocaleString("default", { month: "long" });
    const year = currentMonth.getFullYear();

    return (
      <div className="calendar-view">
        <div className="calendar-header">
          <h3 className="calendar-title">
            {viewMode === "weekly"
              ? `Week of ${days[0].date.toLocaleDateString()}`
              : `${monthName} ${year}`}
          </h3>
          <div className="calendar-nav">
            <button
              onClick={() =>
                setViewMode(viewMode === "monthly" ? "weekly" : "monthly")
              }
            >
              Switch to {viewMode === "monthly" ? "Weekly" : "Monthly"} View
            </button>
            {viewMode === "monthly" ? (
              <>
                <button onClick={getPreviousMonth}>Previous Month</button>
                <button onClick={getNextMonth}>Next Month</button>
              </>
            ) : (
              <>
                <button onClick={getPreviousWeek}>Previous Week</button>
                <button onClick={getNextWeek}>Next Week</button>
              </>
            )}
          </div>
        </div>

        <div className="calendar-grid">
          {/* Day headers */}
          {dayNames.map((day, index) => (
            <div key={`header-${index}`} className="day-header">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((day, index) => {
            const dateAppointments = getAppointmentsForDate(day.date);

            // Check if this day is today
            const isToday = day.date.getTime() === today.getTime();

            return (
              <div
                key={`day-${index}`}
                className={`day-cell ${
                  day.isCurrentMonth ? "current-month" : "other-month"
                } ${isToday ? "today" : ""}`}
              >
                <div className="date-number">{day.date.getDate()}</div>

                {dateAppointments.map((appointment) => {
                  const patient = patients.find(
                    (p) => p.PatientID === appointment.PatientID
                  );
                  const statusClass = `status-${appointment.Status.toLowerCase()}`;

                  return (
                    <div
                      key={appointment.AppointmentID}
                      className={`appointment-item ${statusClass}`}
                      title={`${getPatientName(
                        appointment.PatientID
                      )} - ${formatTime(appointment.AppointmentTime)} - ${
                        appointment.Reason || "No reason provided"
                      }`}
                    >
                      <span className={`appointment-dot ${statusClass}`}></span>
                      {formatTime(appointment.AppointmentTime)} -{" "}
                      {patient ? patient.Name.split(" ")[0] : "Unknown"}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render list view of appointments
  const renderAppointmentsList = () => {
    if (loading) {
      return <div className="loading">Loading appointments...</div>;
    }

    if (filteredAppointments.length === 0) {
      return (
        <div className="no-data">
          No appointments found matching your criteria
        </div>
      );
    }

    return (
      <div className="appointments-table-container">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Time</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((appointment) => (
              <tr key={appointment.AppointmentID}>
                <td>{appointment.AppointmentID}</td>
                <td>{getPatientName(appointment.PatientID)}</td>
                <td>{getDoctorName(appointment.DoctorID)}</td>
                <td>{appointment.Date}</td>
                <td>{formatTime(appointment.AppointmentTime)}</td>
                <td>{appointment.Reason || "N/A"}</td>
                <td>
                  <span
                    className={`appointment-status status-${appointment.Status.toLowerCase()}`}
                  >
                    {appointment.Status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {appointment.Status === "Scheduled" && (
                      <>
                        <button
                          className="complete-btn"
                          onClick={() =>
                            handleStatusChange(
                              appointment.AppointmentID,
                              "Completed"
                            )
                          }
                        >
                          Complete
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={() =>
                            handleStatusChange(
                              appointment.AppointmentID,
                              "Cancelled"
                            )
                          }
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      className="edit-btn"
                      onClick={() => {
                        // Implement edit functionality
                        alert("Edit functionality will be implemented soon");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() =>
                        handleDeleteAppointment(appointment.AppointmentID)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="appointment-management">
      <div className="section-header">
        <h2>Appointment Management</h2>
        <button className="add-button" onClick={() => setShowAddForm(true)}>
          + Create Appointment
        </button>
      </div>

      <div className="appointments-stats">
        <div className="stat-card">
          <div className="stat-count">{appointments.length}</div>
          <div className="stat-label">Total Appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-count">{scheduledCount}</div>
          <div className="stat-label">Scheduled</div>
        </div>
        <div className="stat-card">
          <div className="stat-count">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-count">{cancelledCount}</div>
          <div className="stat-label">Cancelled</div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "list" ? "active" : ""}
          onClick={() => setActiveTab("list")}
        >
          List View
        </button>
        <button
          className={activeTab === "calendar" ? "active" : ""}
          onClick={() => setActiveTab("calendar")}
        >
          Calendar View
        </button>
      </div>

      {activeTab === "list" && (
        <>
          <div className="filter-container">
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by patient, doctor, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              className="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {renderAppointmentsList()}
        </>
      )}

      {activeTab === "calendar" && renderCalendar()}

      {/* Add Appointment Modal */}
      {showAddForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Appointment</h3>
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
                  <label>Patient</label>
                  <select
                    name="PatientID"
                    value={formData.PatientID}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Patient</option>
                    {patients.map((patient) => (
                      <option key={patient.PatientID} value={patient.PatientID}>
                        {patient.Name}
                      </option>
                    ))}
                  </select>
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
                      <option key={doctor.EmployeeID} value={doctor.EmployeeID}>
                        Dr. {doctor.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="Date"
                    value={formData.Date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    name="AppointmentTime"
                    value={formData.AppointmentTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <input
                    type="text"
                    name="Reason"
                    value={formData.Reason}
                    onChange={handleChange}
                    placeholder="Reason for appointment"
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="Status"
                    value={formData.Status}
                    onChange={handleChange}
                    required
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
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
                  Create Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentManagement;
