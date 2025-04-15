import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import PatientManagement from "./PatientManagement";
import RoomManagement from "./RoomManagement";
import AppointmentManagement from "./AppointmentManagement";
import PharmacyManagement from "./PharmacyManagement";
import BillingManagement from "./BillingManagement";

const Dashboard = () => {
  const [activeComponent, setActiveComponent] = useState("dashboard");
  const [dashboardData, setDashboardData] = useState({
    patients: 0,
    rooms: 0,
    appointments: 0,
    pharmacy: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    // Function to fetch dashboard data from database
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Call the dashboard-stats endpoint
        const response = await fetch('http://localhost:5001/api/dashboard-stats');
        
        if (!response.ok) {
          throw new Error('Failed to connect to database');
        }
        
        const data = await response.json();
        
        // Map the returned data to our state variables
        setDashboardData({
          patients: data.admittedPatients || 0,
          rooms: data.availableRooms || 0,
          appointments: data.todayAppointments || 0,
          pharmacy: data.stockItems || 0
        });
        
        setDbError(false);
      } catch (error) {
        console.error("Database connection error:", error);
        setDbError(true);
        // Set all values to 0 when database is not connected
        setDashboardData({
          patients: 0,
          rooms: 0,
          appointments: 0,
          pharmacy: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch data when on dashboard tab
    if (activeComponent === "dashboard") {
      fetchDashboardData();
    }
  }, [activeComponent]);

  const renderComponent = () => {
    switch (activeComponent) {
      case "patients":
        return <PatientManagement />;
      case "rooms":
        return <RoomManagement />;
      case "appointments":
        return <AppointmentManagement />;
      case "pharmacy":
        return <PharmacyManagement />;
      case "billing":
        return <BillingManagement />;
      default:
        return (
          <div className="dashboard-overview">
            <h2>Hospital Management Dashboard</h2>
            {isLoading ? (
              <div className="loading-indicator">Loading dashboard data...</div>
            ) : dbError ? (
              <div className="error-message">
                Database connection failed. Showing default values.
              </div>
            ) : null}
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon">👨‍⚕️</div>
                <h3>Patients</h3>
                <p className="stat-value">{dashboardData.patients}</p>
                <p className="stat-label">Currently Admitted</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🛏️</div>
                <h3>Rooms</h3>
                <p className="stat-value">{dashboardData.rooms}</p>
                <p className="stat-label">Available</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <h3>Appointments</h3>
                <p className="stat-value">{dashboardData.appointments}</p>
                <p className="stat-label">Today</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💊</div>
                <h3>Pharmacy</h3>
                <p className="stat-value">{dashboardData.pharmacy}</p>
                <p className="stat-label">Items in Stock</p>
              </div>
            </div>
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button onClick={() => setActiveComponent("patients")}>
                  Add New Patient
                </button>
                <button onClick={() => setActiveComponent("appointments")}>
                  Book Appointment
                </button>
                <button onClick={() => setActiveComponent("rooms")}>
                  Allocate Room
                </button>
                <button onClick={() => setActiveComponent("billing")}>
                  Generate Bill
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="logo">
          <h1>🏥 HMS</h1>
        </div>
        <nav className="nav-menu">
          <ul>
            <li
              className={activeComponent === "dashboard" ? "active" : ""}
              onClick={() => setActiveComponent("dashboard")}
            >
              <span className="icon">🏠</span>
              <span className="text">Dashboard</span>
            </li>
            <li
              className={activeComponent === "patients" ? "active" : ""}
              onClick={() => setActiveComponent("patients")}
            >
              <span className="icon">👨‍⚕️</span>
              <span className="text">Patients</span>
            </li>
            <li
              className={activeComponent === "rooms" ? "active" : ""}
              onClick={() => setActiveComponent("rooms")}
            >
              <span className="icon">🛏️</span>
              <span className="text">Rooms</span>
            </li>
            <li
              className={activeComponent === "appointments" ? "active" : ""}
              onClick={() => setActiveComponent("appointments")}
            >
              <span className="icon">📅</span>
              <span className="text">Appointments</span>
            </li>
            <li
              className={activeComponent === "pharmacy" ? "active" : ""}
              onClick={() => setActiveComponent("pharmacy")}
            >
              <span className="icon">💊</span>
              <span className="text">Pharmacy</span>
            </li>
            <li
              className={activeComponent === "billing" ? "active" : ""}
              onClick={() => setActiveComponent("billing")}
            >
              <span className="icon">💰</span>
              <span className="text">Billing</span>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">👨‍⚕️</div>
            <div className="user-details">
              <p className="user-name">Admin</p>
              <p className="user-role">Administrator</p>
            </div>
          </div>
        </div>
      </div>
      <div className="main-content">
        <header className="top-bar">
          <div className="search-bar">
            <input type="text" placeholder="Search..." />
            <button>🔍</button>
          </div>
          <div className="top-bar-actions">
            <button className="notification-btn">🔔</button>
            <button className="settings-btn">⚙️</button>
          </div>
        </header>
        <main className="content-area">{renderComponent()}</main>
      </div>
    </div>
  );
};

export default Dashboard;