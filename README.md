# PolyFFF - Poly Food Fair Fundraiser 🍱

A modern web application designed to streamline the management of food fair orders at Polytechnic School.

## 🌟 Features

- **Order Management**
  - Import orders from CSV files
  - Track order status and payment methods
  - Mark orders as picked up
  - Real-time updates across all devices

- **Student Integration**
  - Automatic student matching system
  - Handles nicknames and name variations
  - Supports hyphenated names and reversed name orders

- **Menu Management**
  - Dynamic menu item creation
  - Price management
  - Easy menu updates

- **Payment Tracking**
  - Multiple payment methods (Cash, Venmo, Poly Account, Prepaid)
  - Payment status tracking
  - Total sales reporting

## 📋 Usage Guide

### Importing Orders
1. Prepare a CSV file with the following headers:
   - First Name
   - Last Name
   - Grade
   - [Menu Item Name], [Price]
2. Go to Settings
3. Click "Import CSV"
4. Select your prepared CSV file

### Managing Orders
- View all orders in the main dashboard
- Click on orders to edit details
- Use filters to sort by grade, payment status, or pickup status
- Mark orders as picked up with a single click

### Menu Management
1. Navigate to Settings
2. Under "Manage Menu Items":
   - Add new items with the "Add Menu Item" button
   - Set prices for each item
   - Remove items as needed
   - Save changes

## 💡 Tips & Tricks

- **Student Matching**: The system automatically matches student names, even with:
  - Nicknames (e.g., "Bob" for "Robert")
  - Reversed name order
  - Hyphenated names
  - Common misspellings

- **Bulk Operations**: Use the CSV import/export feature for managing multiple orders

- **Data Backup**: Regular exports of your data are recommended using the "Download CSV" button

## 🔒 Data Security

- All data is stored locally in the browser
- No sensitive information is transmitted to external servers
- Regular backups are recommended using the export feature