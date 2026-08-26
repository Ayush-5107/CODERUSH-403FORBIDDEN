"""
seed_data.py — Static world data for the Rural Healthcare Dispatch simulation.

These coordinates are real Indian rural district locations near Maharashtra
so the OSM road data will exist when the map visualiser fetches it.
"""

HOSPITALS = [
    {
        "id": "hosp_01",
        "name": "Nashik District Hospital",
        "lat": 19.9975,
        "lng": 73.7898,
        "specialties": ["cardiology", "trauma", "general"],
        "bedsAvailable": 8,
        "totalBeds": 20,
    },
    {
        "id": "hosp_02",
        "name": "Sinnar Rural Medical Centre",
        "lat": 19.8494,
        "lng": 74.0006,
        "specialties": ["general", "orthopaedics"],
        "bedsAvailable": 3,
        "totalBeds": 10,
    },
    {
        "id": "hosp_03",
        "name": "Igatpuri Primary Health",
        "lat": 19.6926,
        "lng": 73.5614,
        "specialties": ["general"],
        "bedsAvailable": 5,
        "totalBeds": 8,
    },
    {
        "id": "hosp_04",
        "name": "Dindori Community Hospital",
        "lat": 20.2011,
        "lng": 73.8302,
        "specialties": ["cardiology", "trauma"],
        "bedsAvailable": 6,
        "totalBeds": 12,
    },
]

AMBULANCES = [
    {"id": "amb_01", "status": "available", "lat": 19.9500, "lng": 73.7600},
    {"id": "amb_02", "status": "available", "lat": 20.0100, "lng": 73.8100},
    {"id": "amb_03", "status": "available", "lat": 19.8800, "lng": 73.7200},
    {"id": "amb_04", "status": "available", "lat": 19.9200, "lng": 73.9000},
    {"id": "amb_05", "status": "available", "lat": 20.1500, "lng": 73.8000},
]

MEDICINE_STOCK = [
    {"hospitalId": "hosp_01", "drug": "epinephrine",   "unitsRemaining": 15},
    {"hospitalId": "hosp_01", "drug": "morphine",       "unitsRemaining": 3},   # low → triggers UI warning
    {"hospitalId": "hosp_02", "drug": "epinephrine",   "unitsRemaining": 8},
    {"hospitalId": "hosp_02", "drug": "atropine",      "unitsRemaining": 4},
    {"hospitalId": "hosp_03", "drug": "paracetamol",   "unitsRemaining": 20},
    {"hospitalId": "hosp_04", "drug": "epinephrine",   "unitsRemaining": 12},
    {"hospitalId": "hosp_04", "drug": "morphine",       "unitsRemaining": 2},   # low
]

# Villages that generate synthetic emergency requests during simulation
VILLAGES = [
    {"id": "vil_01", "name": "Ghoti",         "lat": 19.7300, "lng": 73.6500},
    {"id": "vil_02", "name": "Niphad",         "lat": 20.0800, "lng": 74.1100},
    {"id": "vil_03", "name": "Yeola",          "lat": 20.0400, "lng": 74.4800},
    {"id": "vil_04", "name": "Peth",           "lat": 19.5200, "lng": 73.4800},
    {"id": "vil_05", "name": "Chandwad",       "lat": 20.3300, "lng": 74.2500},
    {"id": "vil_06", "name": "Surgana",        "lat": 20.5600, "lng": 73.6200},
    {"id": "vil_07", "name": "Kalwan",         "lat": 20.5500, "lng": 73.9200},
    {"id": "vil_08", "name": "Trimbakeshwar",  "lat": 19.9300, "lng": 73.5300},
]

SPECIALTIES = ["cardiology", "trauma", "general", "orthopaedics"]
URGENCY_TIERS = ["critical", "urgent", "elevated", "routine"]
