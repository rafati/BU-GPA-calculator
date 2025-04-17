# Analytics Setup Guide

## Overview

This application now supports two methods for tracking analytics:
1. MySQL database (previous implementation)
2. Google Sheets (new implementation)

By default, the application will use Google Sheets for analytics tracking. This document outlines how to set up and use each method.

## Google Sheets Analytics Setup

### 1. Create the Events Sheet

In your Google Sheets document, create a new sheet named `Events` with the following columns:

| Column | Header Name | Description |
|--------|-------------|-------------|
| A | Timestamp | Time when the event was recorded |
| B | SessionId | Unique session identifier |
| C | EventType | Type of event (LOGIN, STUDENT_LOAD, etc.) |
| D | UserEmail | Email of the user who triggered the event |
| E | StudentId | ID of the student associated with the event |
| F | Browser | Browser information |
| G | DeviceType | Type of device (desktop, mobile, etc.) |
| H | OS | Operating system information |
| I | IPAddress | IP address |
| J | Referrer | Referring URL |
| K | AdditionalData | JSON string with additional event data |

### 2. Update Environment Variables

Make sure your environment variables are properly set:

```
# Required for Google Sheets access
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account",...}

# You can use a dedicated sheet for analytics (recommended)
GOOGLE_ANALYTICS_SHEET_ID=your_analytics_google_sheet_id

# Or use the same sheet as your main application data
# If GOOGLE_ANALYTICS_SHEET_ID is not set, the application will fall back to this
GOOGLE_SHEET_ID=your_main_google_sheet_id

# Set to false or omit to use Google Sheets
USE_MYSQL_ANALYTICS=false
```

### 3. Service Account Permissions

Ensure your Google service account has write access to the Google Sheet. The scopes defined in the code include:
```
scopes: ['https://www.googleapis.com/auth/spreadsheets']
```

## MySQL Analytics Setup (Alternative)

If you prefer to use MySQL for analytics tracking, follow these steps:

### 1. Create the MySQL Database and Table

```sql
CREATE DATABASE IF NOT EXISTS gpa_analytics;
USE gpa_analytics;

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  user_email VARCHAR(255),
  student_id VARCHAR(50),
  browser VARCHAR(255),
  device_type VARCHAR(50),
  os VARCHAR(100),
  ip_address VARCHAR(50),
  referrer VARCHAR(500),
  additional_data JSON
);
```

### 2. Update Environment Variables

```
# Set to true to use MySQL instead of Google Sheets
USE_MYSQL_ANALYTICS=true

# MySQL connection details
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=gpa_analytics
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
```

## Switching Between Analytics Methods

To switch between MySQL and Google Sheets:

1. Set `USE_MYSQL_ANALYTICS=true` to use MySQL
2. Set `USE_MYSQL_ANALYTICS=false` or omit this variable to use Google Sheets

## Troubleshooting

### Google Sheets Issues

- Make sure the `Events` sheet exists in your Google Sheets document
- Verify that your service account has write access to the sheet
- Check that `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` contains valid credentials
- Confirm that either `GOOGLE_ANALYTICS_SHEET_ID` or `GOOGLE_SHEET_ID` is correct

### MySQL Issues

- Verify MySQL is running and accessible
- Check database connection credentials
- Ensure the events table has been created with the correct schema 