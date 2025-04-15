import React, { useState, useEffect } from "react";
import axios from "axios";
import "./PharmacyManagement.css";
// Import all medication images
import alleriStop from "./images/alleristop.webp";
import coldFix from "./images/cold-fix.png";
import dermaCare from "./images/dermacare.webp";
import digestEase from "./images/digestease.jpg";
import flexiJoint from "./images/flexijoint.jpg";
import immuneBoost from "./images/immuneboost.webp";
import lungClear from "./images/lungclear.jpg";
import painAway from "./images/painaway.jpeg";
import sleepWell from "./images/sleepwell.webp";

const PharmacyManagement = () => {
  const [medications, setMedications] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("grid");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const [formData, setFormData] = useState({
    Name: "",
    Description: "",
    Price: "",
    ExpiryDate: "",
    PharmacyID: "",
    ManufacturerID: "",
    Quantity: "",
  });

  const [restockData, setRestockData] = useState({
    quantity: 0,
    newExpiryDate: "",
  });

  useEffect(() => {
    fetchMedications();
    fetchInventory();
    fetchManufacturers();
    fetchPharmacies();
  }, []);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5001/medications");
      setMedications(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching medications:", error);
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await axios.get("http://localhost:5001/inventory");
      setInventory(response.data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const response = await axios.get("http://localhost:5001/manufacturers");
      setManufacturers(response.data);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
    }
  };

  const fetchPharmacies = async () => {
    try {
      const response = await axios.get("http://localhost:5001/pharmacies");
      setPharmacies(response.data);
    } catch (error) {
      console.error("Error fetching pharmacies:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRestockChange = (e) => {
    setRestockData({
      ...restockData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5001/medications", formData);
      fetchMedications();
      fetchInventory();
      setFormData({
        Name: "",
        Description: "",
        Price: "",
        ExpiryDate: "",
        PharmacyID: "",
        ManufacturerID: "",
        Quantity: "",
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding medication:", error);
      alert("Failed to add medication. Please try again.");
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `http://localhost:5001/inventory/${selectedMedication.InventoryID}`,
        {
          quantity: parseInt(restockData.quantity, 10),
          expiryDate:
            restockData.newExpiryDate || selectedMedication.ExpiryDate,
        }
      );
      fetchInventory();
      setShowRestockModal(false);
      setRestockData({ quantity: 0, newExpiryDate: "" });
    } catch (error) {
      console.error("Error restocking medication:", error);
      alert("Failed to restock medication. Please try again.");
    }
  };

  const handleDeleteMedication = async (medicationID) => {
    if (window.confirm("Are you sure you want to delete this medication?")) {
      try {
        await axios.delete(`http://localhost:5001/medications/${medicationID}`);
        fetchMedications();
        fetchInventory();
      } catch (error) {
        console.error("Error deleting medication:", error);
        alert("Failed to delete medication. Please try again.");
      }
    }
  };

  // Get inventory data for a medication
  const getMedicationInventory = (medicationID) => {
    return (
      inventory.find((inv) => inv.MedicationID === medicationID) || {
        Quantity: 0,
      }
    );
  };

  // Get manufacturer name by ID
  const getManufacturerName = (manufacturerID) => {
    const manufacturer = manufacturers.find(
      (m) => m.ManufacturerID === manufacturerID
    );
    return manufacturer ? manufacturer.Name : "Unknown Manufacturer";
  };

  // Get pharmacy name by ID
  const getPharmacyName = (pharmacyID) => {
    const pharmacy = pharmacies.find((p) => p.PharmacyID === pharmacyID);
    return pharmacy ? pharmacy.Name : "Unknown Pharmacy";
  };

  // Filter medications based on search and filter criteria
  const filteredMedications = medications.filter((medication) => {
    // Search term filter
    const searchMatch =
      searchTerm === "" ||
      medication.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medication.Description &&
        medication.Description.toLowerCase().includes(
          searchTerm.toLowerCase()
        ));

    // Stock filter
    const inventoryItem = getMedicationInventory(medication.MedicationID);
    const quantity = inventoryItem.Quantity || 0;

    let stockMatch = true;
    if (stockFilter === "low") {
      stockMatch = quantity > 0 && quantity <= 10;
    } else if (stockFilter === "medium") {
      stockMatch = quantity > 10 && quantity <= 50;
    } else if (stockFilter === "high") {
      stockMatch = quantity > 50;
    } else if (stockFilter === "out") {
      stockMatch = quantity === 0;
    }

    return searchMatch && stockMatch;
  });

  // Calculate inventory statistics
  const totalMedications = medications.length;
  const outOfStock = inventory.filter((item) => item.Quantity === 0).length;
  const lowStock = inventory.filter(
    (item) => item.Quantity > 0 && item.Quantity <= 10
  ).length;

  // Calculate expiring soon (within 30 days)
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const expiringSoon = medications.filter((med) => {
    const expiryDate = new Date(med.ExpiryDate);
    return expiryDate > today && expiryDate <= thirtyDaysFromNow;
  }).length;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Calculate stock status for a quantity
  const getStockStatus = (quantity) => {
    if (quantity === 0) return "out";
    if (quantity <= 10) return "low";
    if (quantity <= 50) return "medium";
    return "high";
  };

  // Check if medication is expiring soon (within 30 days)
  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiry = new Date(expiryDate);
    return expiry > today && expiry <= thirtyDaysFromNow;
  };

  // Check if medication is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;

    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  // Create a mapping of medication names to their images
  const medicationImages = {
    alleristop: alleriStop,
    "cold-fix": coldFix,
    dermacare: dermaCare,
    digestease: digestEase,
    flexijoint: flexiJoint,
    immuneboost: immuneBoost,
    lungclear: lungClear,
    painaway: painAway,
    sleepwell: sleepWell,
  };

  // Get image URL for medication based on its name
  const getMedicationImage = (medication) => {
    if (!medication || !medication.Name) {
      return coldFix;
    }

    const formattedName = medication.Name.toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");

    return medicationImages[formattedName] || coldFix;
  };

  // Render grid view
  const renderGridView = () => {
    if (loading) {
      return <div className="loading">Loading medications...</div>;
    }

    if (filteredMedications.length === 0) {
      return (
        <div className="no-medications">
          No medications found matching your criteria
        </div>
      );
    }

    return (
      <div className="medication-grid">
        {filteredMedications.map((medication) => {
          const inventoryItem = getMedicationInventory(medication.MedicationID);
          const quantity = inventoryItem.Quantity || 0;
          const stockStatus = getStockStatus(quantity);
          const stockPercentage = Math.min((quantity / 100) * 100, 100); // Assuming 100 is max capacity

          return (
            <div key={medication.MedicationID} className="medication-card">
              <div className="medication-header">
                <div className="medication-header-content">
                  <div className="medication-thumbnail">
                    <img
                      src={getMedicationImage(medication)}
                      alt={medication.Name}
                    />
                  </div>
                  <h3>{medication.Name}</h3>
                </div>
              </div>
              <div className="medication-details">
                <div className="medication-detail">
                  <span className="detail-label">Manufacturer:</span>
                  <span className="detail-value">
                    {getManufacturerName(medication.ManufacturerID)}
                  </span>
                </div>
                <div className="medication-detail">
                  <span className="detail-label">Price:</span>
                  <span className="detail-value">
                    ${parseFloat(medication.Price).toFixed(2)}
                  </span>
                </div>
                <div className="medication-detail">
                  <span className="detail-label">Expiry Date:</span>
                  <span className="detail-value">
                    {formatDate(medication.ExpiryDate)}
                    {isExpired(medication.ExpiryDate) && (
                      <span className="expiry-date-warning"> (Expired!)</span>
                    )}
                    {!isExpired(medication.ExpiryDate) &&
                      isExpiringSoon(medication.ExpiryDate) && (
                        <span className="expiry-date-warning">
                          {" "}
                          (Expiring Soon!)
                        </span>
                      )}
                  </span>
                </div>
                <div className="medication-detail">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">
                    {getPharmacyName(medication.PharmacyID)}
                  </span>
                </div>

                <div className="medication-stock">
                  <span className="stock-label">Stock:</span>
                  <div className="stock-bar">
                    <div
                      className={`stock-fill stock-${stockStatus}`}
                      style={{ width: `${stockPercentage}%` }}
                    ></div>
                  </div>
                  <span className="detail-value" style={{ marginLeft: "10px" }}>
                    {quantity}
                  </span>
                </div>
              </div>
              <div className="medication-footer">
                <button
                  className="update-stock-btn"
                  onClick={() => {
                    setSelectedMedication({
                      ...medication,
                      ...inventoryItem,
                      InventoryID: inventoryItem.InventoryID,
                    });
                    setRestockData({
                      quantity: inventoryItem.Quantity || 0,
                      newExpiryDate: "",
                    });
                    setShowRestockModal(true);
                  }}
                >
                  Update Stock
                </button>
                <button
                  className="view-details-btn"
                  onClick={() => {
                    setSelectedMedication({
                      ...medication,
                      ...inventoryItem,
                      InventoryID: inventoryItem.InventoryID,
                    });
                    setShowDetailsModal(true);
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render table view
  const renderTableView = () => {
    if (loading) {
      return <div className="loading">Loading medications...</div>;
    }

    if (filteredMedications.length === 0) {
      return (
        <div className="no-medications">
          No medications found matching your criteria
        </div>
      );
    }

    return (
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Manufacturer</th>
              <th>Price</th>
              <th>Expiry Date</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMedications.map((medication) => {
              const inventoryItem = getMedicationInventory(
                medication.MedicationID
              );
              const quantity = inventoryItem.Quantity || 0;
              const stockStatus = getStockStatus(quantity);

              return (
                <tr key={medication.MedicationID}>
                  <td>{medication.MedicationID}</td>
                  <td>{medication.Name}</td>
                  <td>{getManufacturerName(medication.ManufacturerID)}</td>
                  <td>${parseFloat(medication.Price).toFixed(2)}</td>
                  <td>
                    {formatDate(medication.ExpiryDate)}
                    {isExpired(medication.ExpiryDate) && (
                      <span className="expiry-date-warning"> (Expired!)</span>
                    )}
                    {!isExpired(medication.ExpiryDate) &&
                      isExpiringSoon(medication.ExpiryDate) && (
                        <span className="expiry-date-warning">
                          {" "}
                          (Expiring Soon!)
                        </span>
                      )}
                  </td>
                  <td>{quantity}</td>
                  <td>
                    <span className={`stock-status status-${stockStatus}`}>
                      {stockStatus === "out"
                        ? "Out of Stock"
                        : stockStatus === "low"
                        ? "Low Stock"
                        : stockStatus === "medium"
                        ? "Medium Stock"
                        : "In Stock"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="restock-btn"
                        onClick={() => {
                          setSelectedMedication({
                            ...medication,
                            ...inventoryItem,
                            InventoryID: inventoryItem.InventoryID,
                          });
                          setRestockData({
                            quantity: inventoryItem.Quantity || 0,
                            newExpiryDate: "",
                          });
                          setShowRestockModal(true);
                        }}
                      >
                        Restock
                      </button>
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
                        className="delete-btn"
                        onClick={() =>
                          handleDeleteMedication(medication.MedicationID)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="pharmacy-management">
      <div className="section-header">
        <h2>Pharmacy Management</h2>
        <button className="add-button" onClick={() => setShowAddForm(true)}>
          + Add Medication
        </button>
      </div>

      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-icon">💊</div>
          <div className="stat-value">{totalMedications}</div>
          <div className="stat-label">Total Medications</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-value">{outOfStock}</div>
          <div className="stat-label">Out of Stock</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value">{lowStock}</div>
          <div className="stat-label">Low Stock</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{expiringSoon}</div>
          <div className="stat-label">Expiring Soon</div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "grid" ? "active" : ""}
          onClick={() => setActiveTab("grid")}
        >
          Grid View
        </button>
        <button
          className={activeTab === "table" ? "active" : ""}
          onClick={() => setActiveTab("table")}
        >
          Table View
        </button>
      </div>

      <div className="search-filter-container">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search medications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-dropdown">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">All Stock Levels</option>
            <option value="out">Out of Stock</option>
            <option value="low">Low Stock</option>
            <option value="medium">Medium Stock</option>
            <option value="high">High Stock</option>
          </select>
        </div>
      </div>

      {/* Render grid or table view based on active tab */}
      {activeTab === "grid" ? renderGridView() : renderTableView()}

      {/* Add Medication Modal */}
      {showAddForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Medication</h3>
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
                  <label>Medication Name</label>
                  <input
                    type="text"
                    name="Name"
                    value={formData.Name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    name="Description"
                    value={formData.Description}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    name="Price"
                    step="0.01"
                    min="0"
                    value={formData.Price}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    name="ExpiryDate"
                    value={formData.ExpiryDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pharmacy</label>
                  <select
                    name="PharmacyID"
                    value={formData.PharmacyID}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Pharmacy</option>
                    {pharmacies.map((pharmacy) => (
                      <option
                        key={pharmacy.PharmacyID}
                        value={pharmacy.PharmacyID}
                      >
                        {pharmacy.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Manufacturer</label>
                  <select
                    name="ManufacturerID"
                    value={formData.ManufacturerID}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Manufacturer</option>
                    {manufacturers.map((manufacturer) => (
                      <option
                        key={manufacturer.ManufacturerID}
                        value={manufacturer.ManufacturerID}
                      >
                        {manufacturer.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Quantity</label>
                  <input
                    type="number"
                    name="Quantity"
                    min="0"
                    value={formData.Quantity}
                    onChange={handleChange}
                    required
                  />
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
                  Add Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedMedication && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Update Stock - {selectedMedication.Name}</h3>
              <button
                className="close-btn"
                onClick={() => setShowRestockModal(false)}
              >
                ×
              </button>
            </div>
            <div className="restock-modal-content">
              <div className="restock-current">
                <span>
                  <strong>Current Stock:</strong>{" "}
                  {selectedMedication.Quantity || 0}
                </span>
                <span>
                  <strong>Expiry Date:</strong>{" "}
                  {formatDate(selectedMedication.ExpiryDate)}
                </span>
              </div>

              <form className="restock-form" onSubmit={handleRestock}>
                <div className="form-group">
                  <label>New Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    value={restockData.quantity}
                    onChange={handleRestockChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Expiry Date (leave blank to keep current)</label>
                  <input
                    type="date"
                    name="newExpiryDate"
                    value={restockData.newExpiryDate}
                    onChange={handleRestockChange}
                  />
                </div>

                <div className="restock-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowRestockModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    Update Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Medication Details Modal */}
      {showDetailsModal && selectedMedication && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Medication Details</h3>
              <button
                className="close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="medication-details-modal">
              <div className="medication-image-container">
                <img
                  src={getMedicationImage(selectedMedication)}
                  alt={selectedMedication.Name}
                  className="medication-image"
                />
              </div>

              <div className="medication-details-content">
                <h2 className="medication-name">{selectedMedication.Name}</h2>

                <div className="details-group">
                  <h4>Basic Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Manufacturer:</span>
                    <span className="detail-value">
                      {getManufacturerName(selectedMedication.ManufacturerID)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">
                      ${parseFloat(selectedMedication.Price).toFixed(2)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Current Stock:</span>
                    <span className="detail-value">
                      {selectedMedication.Quantity || 0} units
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">
                      {getPharmacyName(selectedMedication.PharmacyID)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Expiry Date:</span>
                    <span className="detail-value">
                      {formatDate(selectedMedication.ExpiryDate)}
                      {isExpired(selectedMedication.ExpiryDate) && (
                        <span className="expiry-date-warning"> (Expired!)</span>
                      )}
                      {!isExpired(selectedMedication.ExpiryDate) &&
                        isExpiringSoon(selectedMedication.ExpiryDate) && (
                          <span className="expiry-date-warning">
                            {" "}
                            (Expiring Soon!)
                          </span>
                        )}
                    </span>
                  </div>
                </div>

                <div className="details-group">
                  <h4>Description</h4>
                  <p className="medication-description">
                    {selectedMedication.Description ||
                      `${
                        selectedMedication.Name
                      } is a medication manufactured by ${getManufacturerName(
                        selectedMedication.ManufacturerID
                      )}. 
                     It is stored at ${getPharmacyName(
                       selectedMedication.PharmacyID
                     )} pharmacy.`}
                  </p>
                </div>

                <div className="details-group">
                  <h4>Usage Instructions</h4>
                  <p className="medication-usage">
                    Always follow your doctor's instructions and read the
                    medication leaflet before use. Store in a cool, dry place
                    away from direct sunlight.
                  </p>
                </div>

                <div className="details-group">
                  <h4>Stock Status</h4>
                  <div className="stock-status-container">
                    <div className="stock-bar-large">
                      <div
                        className={`stock-fill stock-${getStockStatus(
                          selectedMedication.Quantity || 0
                        )}`}
                        style={{
                          width: `${Math.min(
                            ((selectedMedication.Quantity || 0) / 100) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="stock-labels">
                      <span
                        className={`stock-status status-${getStockStatus(
                          selectedMedication.Quantity || 0
                        )}`}
                      >
                        {getStockStatus(selectedMedication.Quantity || 0) ===
                        "out"
                          ? "Out of Stock"
                          : getStockStatus(selectedMedication.Quantity || 0) ===
                            "low"
                          ? "Low Stock"
                          : getStockStatus(selectedMedication.Quantity || 0) ===
                            "medium"
                          ? "Medium Stock"
                          : "In Stock"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="update-stock-btn"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setRestockData({
                      quantity: selectedMedication.Quantity || 0,
                      newExpiryDate: "",
                    });
                    setShowRestockModal(true);
                  }}
                >
                  Update Stock
                </button>
                <button
                  className="close-details-btn"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyManagement;
