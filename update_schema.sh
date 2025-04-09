#!/bin/bash

# Set variables for database connection
DB_USER=${MYSQL_USER:-"gpa_analytics_user"}
DB_PASS=${MYSQL_PASSWORD:-"your_secure_password"}
DB_NAME=${MYSQL_DATABASE:-"gpa_analytics"}
DB_HOST=${MYSQL_HOST:-"localhost"}
DB_PORT=${MYSQL_PORT:-"3306"}

# Execute the SQL script
echo "Updating event_type column size in events table..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < alter_events_table.sql

if [ $? -eq 0 ]; then
  echo "Table updated successfully!"
else
  echo "Error updating table. Please check your database connection and credentials."
fi 