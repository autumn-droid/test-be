# Product Requirements Document (PRD): Location-Based Appointment Discovery

**Version:** 1.0.0
**Status:** Approved / Ready for Development
**Feature:** Proximity-Based Appointment Fetching (Nearby Dates)

---

## 1. Feature Overview
The goal of this feature is to enhance user engagement by allowing users to discover appointments/dates occurring near their physical location. The system will take the requester's real-time GPS coordinates and return a list of appointments sorted by proximity.

---

## 2. User Story
**As a requester**, I want to see appointments happening near my current location so that I can find convenient opportunities to join or meet others without traveling long distances.

---

## 3. Functional Requirements

### 3.1 Request Payload (Client-to-Server)
The mobile client must send a GET request containing the user's current geospatial data.
* **Parameters:**
    * `latitude` (Decimal/Double): The current latitude of the user.
    * `longitude` (Decimal/Double): The current longitude of the user.
    * `radius` (Optional, Integer): The maximum distance in kilometers (default: 10km).

### 3.2 Server-Side Logic (Geospatial Calculation)
Upon receiving the coordinates, the server must:
1.  **Filter:** Query the database for active appointments with valid `lat` and `long` values.
2.  **Distance Calculation:** Calculate the distance between the requester's coordinates and each appointment's coordinates.
3.  **Sort:** Arrange the list in ascending order (closest to farthest).
4.  **Range Validation:** Only include appointments within the defined `radius`.
