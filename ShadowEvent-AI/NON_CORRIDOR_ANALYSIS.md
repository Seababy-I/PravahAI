# Non-Corridor Incident Analysis

## 1. Quantification
Of the 8,139 incidents in the dataset, **3,090 (37.97%)** are classified as "Non-corridor". 

This significant percentage skews the overall dashboard, making "Non-corridor" appear as the top hotspot and top shadow event, which obscures actionable intelligence for specific named roads.

---

## 2. Rankings Comparison

### Hotspots

**Including Non-Corridor:**
| Rank | Corridor | Total Incidents | Hotspot Score |
| :--- | :--- | :--- | :--- |
| 1 | Non-corridor | 3,090 | 1.0000 |
| 2 | Mysore Road | 743 | 0.3452 |
| 3 | Bellary Road 1 | 610 | 0.2883 |
| 4 | Tumkur Road | 458 | 0.2163 |
| 5 | Bellary Road 2 | 379 | 0.1927 |

**Excluding Non-Corridor (Actionable):**
| Rank | Corridor | Total Incidents | Hotspot Score |
| :--- | :--- | :--- | :--- |
| 1 | Mysore Road | 743 | 0.3452 |
| 2 | Bellary Road 1 | 610 | 0.2883 |
| 3 | Tumkur Road | 458 | 0.2163 |
| 4 | Bellary Road 2 | 379 | 0.1927 |
| 5 | Hosur Road | 298 | 0.1446 |

### Shadow Events (Highest SERI)

**Including Non-Corridor:**
| Rank | Corridor | Day | Time Bucket | SERI |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Non-corridor | Tuesday | midnight | 96.52 |
| 2 | Non-corridor | Thursday | morning | 90.62 |
| 3 | Non-corridor | Thursday | midnight | 89.08 |

**Excluding Non-Corridor (Actionable):**
| Rank | Corridor | Day | Time Bucket | SERI |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Mysore Road | Wednesday | midnight | 43.94 |
| 2 | Mysore Road | Tuesday | midnight | 42.98 |
| 3 | ORR East 2 | Monday | midnight | 42.58 |

---

## 3. Implementation Updates

- **Dashboard Rankings:** All API calls powering the dashboard metrics (KPIs, Cause Distribution, Time Distribution) and rankings (Hotspots, Shadow Events) now exclude "Non-corridor" data by default.
- **Dynamic Toggle:** A "Include Non-Corridor" toggle has been added to the dashboard header, allowing users to switch contexts and evaluate the entire dataset if necessary.
