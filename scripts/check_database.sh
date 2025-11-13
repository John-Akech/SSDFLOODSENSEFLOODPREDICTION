#!/bin/bash
# Database Check Script for DigitalOcean Droplet
# Usage: ./check_database.sh [command]
# Commands: tables, users, predictions, alerts, stats, all

CONTAINER="floodsense-db"
DB_USER="floodsense_user"
DB_NAME="floodsense_db"

function run_query() {
    docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "$1"
}

function show_tables() {
    echo "=== DATABASE TABLES ==="
    run_query "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
}

function show_table_counts() {
    echo "=== TABLE ROW COUNTS ==="
    run_query "
    SELECT 
        schemaname,
        tablename,
        n_live_tup AS row_count
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC;
    "
}

function show_users() {
    echo "=== USERS TABLE ==="
    run_query "SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 10;"
}

function show_predictions() {
    echo "=== RECENT PREDICTIONS ==="
    run_query "SELECT id, latitude, longitude, flood_probability, risk_level, model_type, created_at FROM predictions ORDER BY created_at DESC LIMIT 10;"
}

function show_flood_events() {
    echo "=== FLOOD EVENTS ==="
    run_query "SELECT id, date_time, latitude, longitude, severity, state, location_name, verified FROM flood_events ORDER BY date_time DESC LIMIT 10;"
}

function show_alerts() {
    echo "=== ACTIVE ALERTS ==="
    run_query "SELECT id, alert_type, severity, state, latitude, longitude, is_active, created_at FROM alerts WHERE is_active = true ORDER BY created_at DESC LIMIT 10;"
}

function show_feedback() {
    echo "=== RECENT FEEDBACK ==="
    run_query "SELECT id, rating, comments, created_at FROM feedback ORDER BY created_at DESC LIMIT 10;"
}

function show_stats() {
    echo "=== DATABASE STATISTICS ==="
    echo ""
    echo "Total Users:"
    run_query "SELECT COUNT(*) as total_users FROM users;"
    echo ""
    echo "Total Predictions:"
    run_query "SELECT COUNT(*) as total_predictions FROM predictions;"
    echo ""
    echo "Total Flood Events:"
    run_query "SELECT COUNT(*) as total_flood_events FROM flood_events;"
    echo ""
    echo "Active Alerts:"
    run_query "SELECT COUNT(*) as active_alerts FROM alerts WHERE is_active = true;"
    echo ""
    echo "Predictions by Model:"
    run_query "SELECT model_type, COUNT(*) as count FROM predictions GROUP BY model_type ORDER BY count DESC;"
    echo ""
    echo "Predictions by Risk Level:"
    run_query "SELECT risk_level, COUNT(*) as count FROM predictions GROUP BY risk_level ORDER BY count DESC;"
}

function show_database_info() {
    echo "=== DATABASE CONNECTION INFO ==="
    run_query "SELECT version();"
    echo ""
    echo "=== DATABASE SIZE ==="
    run_query "SELECT pg_size_pretty(pg_database_size('$DB_NAME')) as database_size;"
    echo ""
    echo "=== TABLE SIZES ==="
    run_query "
    SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    "
}

function show_all() {
    show_database_info
    echo ""
    show_tables
    echo ""
    show_table_counts
    echo ""
    show_stats
}

# Main script
case "${1:-all}" in
    tables)
        show_tables
        ;;
    counts)
        show_table_counts
        ;;
    users)
        show_users
        ;;
    predictions)
        show_predictions
        ;;
    events)
        show_flood_events
        ;;
    alerts)
        show_alerts
        ;;
    feedback)
        show_feedback
        ;;
    stats)
        show_stats
        ;;
    info)
        show_database_info
        ;;
    all)
        show_all
        ;;
    *)
        echo "Usage: $0 [command]"
        echo "Commands:"
        echo "  tables      - List all tables"
        echo "  counts      - Show row counts for each table"
        echo "  users       - Show recent users"
        echo "  predictions - Show recent predictions"
        echo "  events      - Show flood events"
        echo "  alerts      - Show active alerts"
        echo "  feedback    - Show recent feedback"
        echo "  stats       - Show database statistics"
        echo "  info        - Show database info and sizes"
        echo "  all         - Show everything (default)"
        ;;
esac
