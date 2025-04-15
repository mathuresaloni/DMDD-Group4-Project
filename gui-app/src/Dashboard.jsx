import React, { useState } from "react";
import "./Dashboard.css";
import PatientManagement from "./PatientManagement";
import RoomManagement from "./RoomManagement";
import AppointmentManagement from "./AppointmentManagement";
import PharmacyManagement from "./PharmacyManagement";
import BillingManagement from "./BillingManagement";

const Dashboard = () => {
  const [activeComponent, setActiveComponent] = useState("dashboard");

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
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon">👨‍⚕️</div>
                <h3>Patients</h3>
                <p className="stat-value">120</p>
                <p className="stat-label">Currently Admitted</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🛏️</div>
                <h3>Rooms</h3>
                <p className="stat-value">45</p>
                <p className="stat-label">Available</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <h3>Appointments</h3>
                <p className="stat-value">28</p>
                <p className="stat-label">Today</p>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💊</div>
                <h3>Pharmacy</h3>
                <p className="stat-value">520</p>
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
