import React, { useState, useEffect } from "react";
import axios from "axios";
import "./BillingManagement.css";

const BillingManagement = () => {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [showGenerateBill, setShowGenerateBill] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Form data for new bill
  const [billFormData, setBillFormData] = useState({
    patientID: "",
    items: [{ type: "Medication", description: "", quantity: 1, price: 0 }],
    serviceCharges: 0,
    roomCharges: 0,
    consultationFee: 0,
    paymentMethod: "cash",
    paymentStatus: "Paid",
    notes: "",
    partialAmount: 0,
  });

  // Patient room information for inpatients
  const [inpatientRooms, setInpatientRooms] = useState([]);

  useEffect(() => {
    fetchBills();
    fetchPatients();
    fetchMedications();
    fetchInpatientRooms();
  }, []);

  const handleMarkAsPaid = async (billingID, totalAmount) => {
    try {
      await axios.put(`http://localhost:5001/billing/${billingID}`, {
        Status: "Paid",
        AmountPaid: totalAmount,
      });

      fetchBills();
    } catch (error) {
      console.error("Error marking bill as paid:", error);
      alert("Failed to update bill. Please try again.");
    }
  };

  const handleUpdateBillStatus = async (billingID, status, amount) => {
    try {
      await axios.put(`http://localhost:5001/billing/${billingID}`, {
        Status: status,
        AmountPaid: amount,
      });

      fetchBills();
    } catch (error) {
      console.error("Error updating bill status:", error);
      alert("Failed to update bill status. Please try again.");
    }
  };

  const handleDeleteBill = async (billingID) => {
    if (window.confirm("Are you sure you want to delete this bill?")) {
      try {
        await axios.delete(`http://localhost:5001/billing/${billingID}`);
        fetchBills();
      } catch (error) {
        console.error("Error deleting bill:", error);
        alert("Failed to delete bill. Please try again.");
      }
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5001/billing");
      setBills(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching bills:", error);
      setLoading(false);
      // Use empty array if endpoint doesn't exist yet
      setBills([]);
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

  const fetchMedications = async () => {
    try {
      const response = await axios.get("http://localhost:5001/medications");
      setMedications(response.data);
    } catch (error) {
      console.error("Error fetching medications:", error);
    }
  };

  const fetchInpatientRooms = async () => {
    try {
      const response = await axios.get("http://localhost:5001/inpatient-rooms");
      setInpatientRooms(response.data);
    } catch (error) {
      console.error("Error fetching inpatient rooms:", error);
      // This endpoint might not exist yet, so we'll handle the error gracefully
      setInpatientRooms([]);
    }
  };

  const handleBillFormChange = (e) => {
    setBillFormData({
      ...billFormData,
      [e.target.name]: e.target.value,
    });

    // If the patient selection changes, check if they're an inpatient and calculate room charges
    if (e.target.name === "patientID" && e.target.value) {
      const selectedPatient = patients.find(
        (p) => p.PatientID.toString() === e.target.value
      );

      if (selectedPatient && selectedPatient.PatientType === "Inpatient") {
        // Find this patient's room details
        const patientRoom = inpatientRooms.find(
          (room) => room.PatientID.toString() === e.target.value
        );

        if (patientRoom) {
          // Calculate room charges for 3 days
          const daysToCharge = 3;

          // Calculate total room charges
          const roomCharges = daysToCharge * patientRoom.CostPerDay;

          // Update the form with calculated room charges
          setBillFormData((prevState) => ({
            ...prevState,
            roomCharges: roomCharges,
            // For inpatients, we might set a consultation fee as well
            consultationFee: 100, // Example consultation fee
          }));
        }
      } else if (
        selectedPatient &&
        selectedPatient.PatientType === "Outpatient"
      ) {
        // For outpatients, set room charges to 0 but maybe set a consultation fee
        setBillFormData((prevState) => ({
          ...prevState,
          roomCharges: 0,
          consultationFee: 75, // Example outpatient consultation fee
        }));
      }
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedItems = [...billFormData.items];

    // If selecting a medication, automatically fill price
    if (field === "description" && updatedItems[index].type === "Medication") {
      const medication = medications.find(
        (med) => med.MedicationID.toString() === value
      );
      if (medication) {
        updatedItems[index] = {
          ...updatedItems[index],
          [field]: value,
          price: parseFloat(medication.Price),
        };
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          [field]: value,
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }

    setBillFormData({
      ...billFormData,
      items: updatedItems,
    });
  };

  const addLineItem = () => {
    setBillFormData({
      ...billFormData,
      items: [
        ...billFormData.items,
        { type: "Medication", description: "", quantity: 1, price: 0 },
      ],
    });
  };

  const removeLineItem = (index) => {
    const updatedItems = [...billFormData.items];
    updatedItems.splice(index, 1);
    setBillFormData({
      ...billFormData,
      items: updatedItems,
    });
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();

    try {
      // Calculate the total amount
      const totalAmount = calculateTotal();

      // Show the preview
      setShowBillPreview(true);

      // Create the bill object to display
      const newBill = {
        PatientID: billFormData.patientID,
        BillingDate: new Date().toISOString(),
        TotalAmount: totalAmount,
        AmountPaid:
          billFormData.paymentStatus === "Paid"
            ? totalAmount
            : billFormData.paymentStatus === "Partial"
            ? parseFloat(billFormData.partialAmount || 0)
            : 0,
        Status: billFormData.paymentStatus,
        Items: billFormData.items.map((item) => ({
          Type: item.type,
          Description: item.description,
          Quantity: item.quantity,
          Price: item.price,
          Total: item.quantity * item.price,
        })),
        ServiceCharges: parseFloat(billFormData.serviceCharges) || 0,
        RoomCharges: parseFloat(billFormData.roomCharges) || 0,
        ConsultationFee: parseFloat(billFormData.consultationFee) || 0,
        PaymentMethod: billFormData.paymentMethod,
        Notes: billFormData.notes,
        // Flag to indicate this bill hasn't been saved to the database yet
        isSaved: false,
      };

      setSelectedBill(newBill);
    } catch (error) {
      console.error("Error generating bill:", error);
      alert("Failed to generate bill. Please try again.");
    }
  };

  // Calculate subtotal from line items
  const calculateSubtotal = () => {
    return billFormData.items.reduce((total, item) => {
      return total + parseFloat(item.price) * parseInt(item.quantity, 10);
    }, 0);
  };

  // Calculate total bill amount
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const serviceCharges = parseFloat(billFormData.serviceCharges) || 0;
    const roomCharges = parseFloat(billFormData.roomCharges) || 0;
    const consultationFee = parseFloat(billFormData.consultationFee) || 0;

    return subtotal + serviceCharges + roomCharges + consultationFee;
  };

  // Get patient name by ID
  const getPatientName = (patientID) => {
    const patient = patients.find((p) => p.PatientID === patientID);
    return patient ? patient.Name : "Unknown Patient";
  };

  // Get medication name by ID
  const getMedicationName = (medicationID) => {
    const medication = medications.find(
      (m) => m.MedicationID.toString() === medicationID
    );
    return medication ? medication.Name : "Unknown Medication";
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Filter bills based on search term, date and status
  const filteredBills = bills.filter((bill) => {
    // Get patient name for search
    const patient = patients.find((p) => p.PatientID === bill.PatientID);
    const patientName = patient ? patient.Name.toLowerCase() : "";

    // Check search term match
    const searchMatch =
      searchTerm === "" ||
      patientName.includes(searchTerm.toLowerCase()) ||
      bill.BillingID?.toString().includes(searchTerm);

    // Check date match
    const dateMatch =
      dateFilter === "" ||
      (bill.BillingDate && bill.BillingDate.includes(dateFilter));

    // Check status match - ensure case insensitive matching
    let statusMatch = true;
    if (statusFilter !== "all") {
      const billStatus = (bill.Status || "").toLowerCase();
      statusMatch = billStatus === statusFilter.toLowerCase();
    }

    return searchMatch && dateMatch && statusMatch;
  });

  // Mock data for statistics
  // In a real app, these would be calculated from the actual billing data
  const totalBills = filteredBills.length;
  const totalRevenue = filteredBills.reduce(
    (sum, bill) => sum + parseFloat(bill.AmountPaid || 0),
    0
  );
  const paidBills = filteredBills.filter(
    (bill) => bill.Status === "Paid"
  ).length;
  const unpaidBills = filteredBills.filter(
    (bill) => bill.Status === "Unpaid"
  ).length;

  // Render bill cards
  const renderBillCards = () => {
    if (loading) {
      return <div className="loading">Loading bills...</div>;
    }

    if (filteredBills.length === 0) {
      return (
        <div className="no-bills">No bills found matching your criteria</div>
      );
    }

    return (
      <div className="bill-cards">
        {filteredBills.map((bill) => {
          const patient = patients.find((p) => p.PatientID === bill.PatientID);
          const isPaid = bill.Status === "Paid";
          const isPartial = bill.Status === "Partial";

          return (
            <div key={bill.BillingID} className="bill-card">
              <div className="bill-header">
                <span className="bill-id">Bill #{bill.BillingID}</span>
                <span className="bill-date">
                  {formatDate(bill.BillingDate)}
                </span>
              </div>
              <div className="bill-content">
                <div className="bill-patient">
                  <div className="patient-avatar">
                    {patient ? patient.Name.charAt(0) : "?"}
                  </div>
                  <div className="patient-name">
                    {patient ? patient.Name : "Unknown Patient"}
                  </div>
                </div>
                <div className="bill-charges">
                  <div className="charge-item">
                    <span className="charge-label">Service Charges</span>
                    <span className="charge-amount">
                      {formatCurrency(bill.ServiceCharges || 0)}
                    </span>
                  </div>
                  <div className="charge-item">
                    <span className="charge-label">Medication Charges</span>
                    <span className="charge-amount">
                      {formatCurrency(bill.MedicationCharges || 0)}
                    </span>
                  </div>
                  <div className="charge-item">
                    <span className="charge-label">Room Charges</span>
                    <span className="charge-amount">
                      {formatCurrency(bill.RoomCharges || 0)}
                    </span>
                  </div>
                  <div className="charge-item">
                    <span className="charge-label">Consultation Fee</span>
                    <span className="charge-amount">
                      {formatCurrency(bill.ConsultationFee || 0)}
                    </span>
                  </div>
                </div>
                <div className="bill-total">
                  <span>Total</span>
                  <span>{formatCurrency(bill.TotalAmount || 0)}</span>
                </div>
              </div>
              <div className="bill-footer">
                <div>
                  <span
                    className={`payment-status status-${
                      isPaid ? "paid" : isPartial ? "partial" : "unpaid"
                    }`}
                  >
                    {bill.Status || "Unpaid"}
                  </span>
                </div>
                <div className="bill-actions">
                  <button
                    className="view-btn"
                    onClick={() => {
                      setSelectedBill(bill);
                      setShowBillPreview(true);
                    }}
                  >
                    View
                  </button>
                  <button
                    className="print-btn"
                    onClick={() => {
                      setSelectedBill(bill);
                      setShowBillPreview(true);
                      // In a real app, you might trigger printing logic here
                    }}
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render bills table
  const renderBillsTable = () => {
    if (loading) {
      return <div className="loading">Loading bills...</div>;
    }

    if (filteredBills.length === 0) {
      return (
        <div className="no-bills">No bills found matching your criteria</div>
      );
    }

    return (
      <div className="bills-table-container">
        <table className="bills-table">
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Patient</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Amount Paid</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.map((bill) => (
              <tr key={bill.BillingID}>
                <td>{bill.BillingID}</td>
                <td>{getPatientName(bill.PatientID)}</td>
                <td>{formatDate(bill.BillingDate)}</td>
                <td>{formatCurrency(bill.TotalAmount || 0)}</td>
                <td>{formatCurrency(bill.AmountPaid || 0)}</td>
                <td>
                  <span
                    className={`payment-status status-${
                      bill.Status === "Paid"
                        ? "paid"
                        : bill.Status === "Partial"
                        ? "partial"
                        : "unpaid"
                    }`}
                  >
                    {bill.Status || "Unpaid"}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="view-btn"
                      onClick={() => {
                        setSelectedBill(bill);
                        setShowBillPreview(true);
                      }}
                    >
                      View
                    </button>

                    {/* Status dropdown instead of multiple buttons */}
                    <div className="status-dropdown-container">
                      <select
                        className="status-dropdown"
                        value={bill.Status || "Unpaid"}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          if (newStatus === "Paid") {
                            handleMarkAsPaid(bill.BillingID, bill.TotalAmount);
                          } else if (newStatus === "Unpaid") {
                            handleUpdateBillStatus(bill.BillingID, "Unpaid", 0);
                          } else if (newStatus === "Partial") {
                            setSelectedBill(bill);
                            setBillFormData({
                              ...billFormData,
                              paymentStatus: "Partial",
                              partialAmount: Math.round(bill.TotalAmount / 2), // Default to half paid
                            });
                            setShowEditForm(true);
                          }
                        }}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </div>

                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteBill(bill.BillingID)}
                    >
                      Delete
                    </button>
                    <button
                      className="print-btn"
                      onClick={() => {
                        setSelectedBill(bill);
                        setShowBillPreview(true);
                      }}
                    >
                      Print
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

  // Render generate bill form
  const renderGenerateBillForm = () => {
    const selectedPatient = patients.find(
      (p) => p.PatientID.toString() === billFormData.patientID
    );

    return (
      <div className="billing-form">
        <div className="billing-form-header">
          <h3>Generate New Bill</h3>
          <p>Complete the form below to generate a new bill for a patient</p>
        </div>

        <form onSubmit={handleGenerateBill}>
          {/* Patient Selection */}
          <div className="patient-selection">
            <label htmlFor="patientID">Select Patient:</label>
            <select
              id="patientID"
              name="patientID"
              value={billFormData.patientID}
              onChange={handleBillFormChange}
              required
            >
              <option value="">-- Select Patient --</option>
              {patients.map((patient) => (
                <option key={patient.PatientID} value={patient.PatientID}>
                  {patient.Name}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Patient Info */}
          {selectedPatient && (
            <div className="patient-info">
              <div className="patient-info-header">
                <div className="patient-info-avatar">
                  {selectedPatient.Name.charAt(0)}
                </div>
                <div className="patient-info-name">{selectedPatient.Name}</div>
              </div>
              <div className="patient-info-details">
                <div className="patient-detail">
                  <span className="detail-label">Patient ID</span>
                  <span className="detail-value">
                    {selectedPatient.PatientID}
                  </span>
                </div>
                <div className="patient-detail">
                  <span className="detail-label">Age</span>
                  <span className="detail-value">{selectedPatient.Age}</span>
                </div>
                <div className="patient-detail">
                  <span className="detail-label">Gender</span>
                  <span className="detail-value">{selectedPatient.Gender}</span>
                </div>
                <div className="patient-detail">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">
                    {selectedPatient.PhoneNumber}
                  </span>
                </div>
                <div className="patient-detail">
                  <span className="detail-label">Patient Type</span>
                  <span className="detail-value">
                    {selectedPatient.PatientType}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Billing Items */}
          <div className="billing-section">
            <h3 className="section-title">Billing Items</h3>

            <div className="line-items">
              <div className="line-item line-item-header">
                <div>Item</div>
                <div>Quantity</div>
                <div>Price</div>
                <div>Total</div>
              </div>

              {billFormData.items.map((item, index) => (
                <div key={index} className="line-item">
                  <div>
                    <select
                      value={item.type}
                      onChange={(e) =>
                        handleLineItemChange(index, "type", e.target.value)
                      }
                    >
                      <option value="Medication">Medication</option>
                      <option value="Service">Service</option>
                      <option value="Other">Other</option>
                    </select>

                    {item.type === "Medication" ? (
                      <select
                        value={item.description}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        style={{ marginTop: "5px" }}
                        required
                      >
                        <option value="">-- Select Medication --</option>
                        {medications.map((med) => (
                          <option
                            key={med.MedicationID}
                            value={med.MedicationID}
                          >
                            {med.Name} - ${parseFloat(med.Price).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        style={{ marginTop: "5px" }}
                        required
                      />
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineItemChange(index, "quantity", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) =>
                        handleLineItemChange(index, "price", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    {formatCurrency(item.quantity * item.price)}
                    {index > 0 && (
                      <span
                        className="remove-item"
                        onClick={() => removeLineItem(index)}
                        title="Remove item"
                      >
                        &times;
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="add-item-btn"
                onClick={addLineItem}
              >
                + Add Item
              </button>

              <div className="bill-subtotal">
                <div className="subtotal-label">Subtotal:</div>
                <div className="subtotal-value">
                  {formatCurrency(calculateSubtotal())}
                </div>
              </div>
            </div>

            {/* Additional Charges */}
            <h3 className="section-title">Additional Charges</h3>

            <div className="line-items">
              <div className="line-item">
                <div>Service Charges</div>
                <div></div>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="serviceCharges"
                    value={billFormData.serviceCharges}
                    onChange={handleBillFormChange}
                  />
                </div>
                <div>
                  {formatCurrency(parseFloat(billFormData.serviceCharges) || 0)}
                </div>
              </div>

              <div className="line-item">
                <div>Room Charges</div>
                <div></div>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="roomCharges"
                    value={billFormData.roomCharges}
                    onChange={handleBillFormChange}
                    readOnly={
                      selectedPatient &&
                      selectedPatient.PatientType === "Inpatient"
                    }
                    title={
                      selectedPatient &&
                      selectedPatient.PatientType === "Inpatient"
                        ? "Room charges are calculated automatically for inpatients"
                        : ""
                    }
                  />
                </div>
                <div>
                  {formatCurrency(parseFloat(billFormData.roomCharges) || 0)}
                </div>
              </div>

              <div className="line-item">
                <div>Consultation Fee</div>
                <div></div>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="consultationFee"
                    value={billFormData.consultationFee}
                    onChange={handleBillFormChange}
                  />
                </div>
                <div>
                  {formatCurrency(
                    parseFloat(billFormData.consultationFee) || 0
                  )}
                </div>
              </div>

              <div className="bill-total-section">
                <div className="total-label">Total:</div>
                <div className="total-value">
                  {formatCurrency(calculateTotal())}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="payment-section">
            <h3 className="section-title">Payment Information</h3>

            <div className="payment-options">
              <div
                className={`payment-option ${
                  billFormData.paymentMethod === "cash" ? "active" : ""
                }`}
                onClick={() =>
                  handleBillFormChange({
                    target: { name: "paymentMethod", value: "cash" },
                  })
                }
              >
                <div className="payment-icon">💵</div>
                <div className="payment-name">Cash</div>
              </div>

              <div
                className={`payment-option ${
                  billFormData.paymentMethod === "credit" ? "active" : ""
                }`}
                onClick={() =>
                  handleBillFormChange({
                    target: { name: "paymentMethod", value: "credit" },
                  })
                }
              >
                <div className="payment-icon">💳</div>
                <div className="payment-name">Credit Card</div>
              </div>

              <div
                className={`payment-option ${
                  billFormData.paymentMethod === "insurance" ? "active" : ""
                }`}
                onClick={() =>
                  handleBillFormChange({
                    target: { name: "paymentMethod", value: "insurance" },
                  })
                }
              >
                <div className="payment-icon">🏥</div>
                <div className="payment-name">Insurance</div>
              </div>

              <div
                className={`payment-option ${
                  billFormData.paymentMethod === "other" ? "active" : ""
                }`}
                onClick={() =>
                  handleBillFormChange({
                    target: { name: "paymentMethod", value: "other" },
                  })
                }
              >
                <div className="payment-icon">📝</div>
                <div className="payment-name">Other</div>
              </div>
            </div>

            <div className="payment-details">
              <div className="form-group">
                <label>Payment Status</label>
                <select
                  name="paymentStatus"
                  value={billFormData.paymentStatus}
                  onChange={handleBillFormChange}
                >
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial Payment</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={billFormData.notes}
                  onChange={handleBillFormChange}
                  rows="3"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setShowGenerateBill(false)}
            >
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Generate Bill
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Render bill preview
  const renderBillPreview = () => {
    if (!selectedBill) return null;

    const patient = patients.find(
      (p) => p.PatientID === selectedBill.PatientID
    );

    return (
      <div className="modal-backdrop">
        <div className="modal" style={{ maxWidth: "800px" }}>
          <div className="modal-header">
            <h3>Bill Preview</h3>
            <button
              className="close-btn"
              onClick={() => {
                setShowBillPreview(false);
                if (showGenerateBill) {
                  // If we were generating a bill, go back to the form instead of closing everything
                  setSelectedBill(null);
                } else {
                  // If we were just viewing a bill, close everything
                  setSelectedBill(null);
                  setShowGenerateBill(false);
                }
              }}
            >
              ×
            </button>
          </div>

          <div className="bill-preview">
            <div className="bill-preview-header">
              <div className="hospital-info">
                <h2>Hospital Management System</h2>
                <p>123 Medical Center Drive</p>
                <p>Healthcare City, HC 12345</p>
                <p>Phone: (123) 456-7890</p>
              </div>

              <div className="bill-info">
                <h3>Invoice #{selectedBill.BillingID}</h3>
                <p>
                  <strong>Date:</strong> {formatDate(selectedBill.BillingDate)}
                </p>
                <p>
                  <strong>Status:</strong> {selectedBill.Status || "Unpaid"}
                </p>
              </div>
            </div>

            <div className="bill-preview-content">
              <div className="bill-preview-section">
                <h4>Patient Information</h4>
                <p>
                  <strong>Name:</strong>{" "}
                  {patient ? patient.Name : "Unknown Patient"}
                </p>
                <p>
                  <strong>Patient ID:</strong> {selectedBill.PatientID}
                </p>
                <p>
                  <strong>Gender:</strong> {patient ? patient.Gender : "N/A"}
                </p>
                <p>
                  <strong>Phone:</strong>{" "}
                  {patient ? patient.PhoneNumber : "N/A"}
                </p>
              </div>

              {selectedBill.Items && selectedBill.Items.length > 0 && (
                <div className="bill-preview-section">
                  <h4>Billing Items</h4>
                  <table className="bill-preview-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.Items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            {item.Type === "Medication"
                              ? getMedicationName(item.Description)
                              : item.Description}
                          </td>
                          <td>{item.Quantity}</td>
                          <td>{formatCurrency(item.Price)}</td>
                          <td>{formatCurrency(item.Total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bill-preview-section">
                <h4>Charges Summary</h4>
                <table className="bill-preview-table">
                  <tbody>
                    {selectedBill.Items && selectedBill.Items.length > 0 && (
                      <tr>
                        <td>Items Subtotal</td>
                        <td>
                          {formatCurrency(
                            selectedBill.Items.reduce(
                              (sum, item) => sum + item.Total,
                              0
                            )
                          )}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>Service Charges</td>
                      <td>
                        {formatCurrency(selectedBill.ServiceCharges || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td>Room Charges</td>
                      <td>{formatCurrency(selectedBill.RoomCharges || 0)}</td>
                    </tr>
                    <tr>
                      <td>Consultation Fee</td>
                      <td>
                        {formatCurrency(selectedBill.ConsultationFee || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="bill-preview-total">
                  <span>
                    Total: {formatCurrency(selectedBill.TotalAmount || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bill-preview-footer">
              <div>
                <p>
                  <strong>Payment Method:</strong>{" "}
                  {selectedBill.PaymentMethod || "N/A"}
                </p>
                <p>
                  <strong>Amount Paid:</strong>{" "}
                  {formatCurrency(selectedBill.AmountPaid || 0)}
                </p>
              </div>

              <div className="thank-you">
                Thank you for choosing our services!
              </div>
            </div>
          </div>

          <div className="print-actions">
            <button
              className="cancel-btn"
              onClick={() => {
                setShowBillPreview(false);
                if (showGenerateBill) {
                  setSelectedBill(null);
                } else {
                  setSelectedBill(null);
                  setShowGenerateBill(false);
                }
              }}
            >
              Close
            </button>
            {showGenerateBill && !selectedBill.isSaved && (
              <button
                className="submit-btn"
                onClick={async () => {
                  try {
                    // Add the bill to the database
                    const response = await axios.post(
                      "http://localhost:5001/billing",
                      {
                        PatientID: selectedBill.PatientID,
                        PaymentMethodID: 1, // Default to first payment method, adjust as needed
                        ServiceCharges: selectedBill.ServiceCharges || 0,
                        MedicationCharges:
                          selectedBill.Items?.reduce(
                            (sum, item) => sum + item.Total,
                            0
                          ) || 0,
                        RoomCharges: selectedBill.RoomCharges || 0,
                        ConsultationFee: selectedBill.ConsultationFee || 0,
                        TotalAmount: selectedBill.TotalAmount || 0,
                        AmountPaid: selectedBill.AmountPaid || 0,
                        Status: selectedBill.Status || "Unpaid",
                      }
                    );

                    // Update the selected bill with the saved ID and flag
                    setSelectedBill({
                      ...selectedBill,
                      BillingID: response.data.billingID,
                      isSaved: true,
                    });

                    // Show success message
                    alert("Bill saved successfully!");

                    // Refresh the bills list
                    fetchBills();
                  } catch (error) {
                    console.error("Error saving bill:", error);
                    alert("Failed to save bill. Please try again.");
                  }
                }}
              >
                Save Bill
              </button>
            )}
            <button
              className="print-btn"
              onClick={() => {
                window.print();
              }}
            >
              Print Bill
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="billing-management">
      {/* Header */}
      <div className="section-header">
        <h2>Billing Management</h2>
        <button
          className="add-button"
          onClick={() => {
            setShowGenerateBill(true);
            setShowBillPreview(false);
            setSelectedBill(null);
            setBillFormData({
              patientID: "",
              items: [
                { type: "Medication", description: "", quantity: 1, price: 0 },
              ],
              serviceCharges: 0,
              roomCharges: 0,
              consultationFee: 0,
              paymentMethod: "cash",
              paymentStatus: "Paid",
              notes: "",
            });
          }}
        >
          + Generate New Bill
        </button>
      </div>

      {/* Stats */}
      <div className="billing-stats">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-value">{totalBills}</div>
          <div className="stat-label">Total Bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{formatCurrency(totalRevenue)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{paidBills}</div>
          <div className="stat-label">Paid Bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{unpaidBills}</div>
          <div className="stat-label">Unpaid Bills</div>
        </div>
      </div>

      {/* Show either the bills list or generate bill form */}
      {showGenerateBill ? (
        renderGenerateBillForm()
      ) : (
        <>
          {/* Tabs for different views */}
          <div className="tabs">
            <button
              className={activeTab === "list" ? "active" : ""}
              onClick={() => setActiveTab("list")}
            >
              List View
            </button>
            <button
              className={activeTab === "card" ? "active" : ""}
              onClick={() => setActiveTab("card")}
            >
              Card View
            </button>
          </div>

          {/* Filters */}
          <div className="filter-container">
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by patient name or bill number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <input
              type="date"
              className="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <select
              className="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* Content based on selected tab */}
          {activeTab === "list" ? renderBillsTable() : renderBillCards()}
        </>
      )}

      {/* Bill Preview Modal */}
      {showBillPreview && renderBillPreview()}
    </div>
  );
};

export default BillingManagement;
