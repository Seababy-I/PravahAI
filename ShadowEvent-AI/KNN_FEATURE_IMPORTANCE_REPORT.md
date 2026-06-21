# KNN Feature Importance & Similarity Report

This report analyzes the Euclidean distances and feature weights driving the K-Nearest Neighbors (KNN) Similarity Engine.

## 1. Features Used & Preprocessing

The model uses a `ColumnTransformer` to normalize numeric features and encode categorical features:
- **Numeric Features** (`latitude`, `longitude`, `hour`, `day_of_week`): Transformed using `StandardScaler` (zero mean, unit variance).
- **Categorical Features** (`event_cause`, `corridor`): Transformed using `OneHotEncoder`.

## 2. Implicit Feature Weights

In Euclidean space, standard scaling forces numeric features to contribute `1.0` to the squared distance for every standard deviation of difference. One-hot encoding forces a categorical mismatch to contribute exactly `2.0` to the squared distance (as the vectors change from `[1,0]` to `[0,1]`).

**Numeric Standard Deviations (1.0 sq-dist equivalent):**

- **Latitude**: 1 std dev = 0.0579 degrees (~6.4 km). A difference of 0.0579 degrees adds 1.0 to the distance.
- **Longitude**: 1 std dev = 0.0609 degrees (~6.8 km). A difference of 0.0609 degrees adds 1.0 to the distance.
- **Hour**: 1 std dev = 8.19 hours. A difference of 8.19 hours adds 1.0 to the distance.
- **Day of Week**: 1 std dev = 1.88 days. A difference of 1.88 days adds 1.0 to the distance.


**Categorical Weights:**
- An **identical** category contributes `0.0` to squared distance.
- A **mismatched** category contributes `2.0` to squared distance (distance = `sqrt(2) = 1.414`).

---

## 3. Query Breakdown: Exact Distance Contributions

By inspecting the squared differences between a query incident and its nearest neighbor, we can see exactly what dominates the similarity score.

### Example 1: High Similarity Match
- **Query**: FKID000042 (ORR East 1, vehicle_breakdown)
- **Match**: FKID005391 (ORR East 1, vehicle_breakdown)

- **Corridor**: 0.0000 sq-dist (0.0%)
- **Cause**: 0.0000 sq-dist (0.0%)
- **Hour**: 0.0149 sq-dist (99.5%)
- **Day**: 0.0000 sq-dist (0.0%)
- **Coordinates**: 0.0001 sq-dist (0.5%)
- **Total Euclidean Distance**: 0.1224


### Example 2: Where Cause Differs
- **Query**: FKID000253 (Non-corridor, construction)
- **Match**: FKID005416 (Non-corridor, vehicle_breakdown)

- **Corridor**: 0.0000 sq-dist (0.0%)
- **Cause**: 2.0000 sq-dist (57.1%)
- **Hour**: 0.0000 sq-dist (0.0%)
- **Day**: 0.2834 sq-dist (8.1%)
- **Coordinates**: 1.2171 sq-dist (34.8%)
- **Total Euclidean Distance**: 1.8709


### Example 3: Where Corridor Differs
- **Query**: FKID000308 (unknown, pot_holes)
- **Match**: FKID000236 (Non-corridor, pot_holes)

- **Corridor**: 2.0000 sq-dist (96.8%)
- **Cause**: 0.0000 sq-dist (0.0%)
- **Hour**: 0.0149 sq-dist (0.7%)
- **Day**: 0.0000 sq-dist (0.0%)
- **Coordinates**: 0.0508 sq-dist (2.5%)
- **Total Euclidean Distance**: 1.4372


---

## 4. Proof That Similarity Is Not Just Identical Causes

As seen in **Example 2**, the KNN algorithm successfully retrieves nearest neighbors *even when the event causes differ*, provided the temporal and spatial proximities are close enough. 
Because a category mismatch only adds `2.0` to the squared distance, a highly proximate event (e.g., same exact coordinates, hour, and day) with a different cause will outrank an event with the exact same cause that occurred 15 kilometers away or 12 hours apart.

---

## 5. Behavior of Missing Corridors (`NaN`)

During `ColumnTransformer` preprocessing, missing values (`NaN`) in the `corridor` and `event_cause` columns are imputed with the string `"unknown"`. 
Since `"unknown"` acts as its own discrete category in the One-Hot Encoder:
- If a query incident has a missing corridor, it will perfectly match other incidents with missing corridors (0.0 squared distance penalty).
- It will suffer a full categorical mismatch penalty (2.0 squared distance) against *any* named corridor.
- This creates a slight clustering effect where `NaN` incidents group together, which is mathematically sound but analytically noisy.

---

## 6. Recommended Improvements

Currently, the similarity is largely balanced, but there are structural biases in the raw data standard deviations:

1. **Spatial Domination via Coordinates**: Because the geographic bounds of Bengaluru are relatively small, 1 standard deviation of Latitude is approx 6.4 km. An incident 10 km away incurs a massive spatial penalty compared to a category mismatch. **Recommendation**: We should apply a custom weight to latitude/longitude (e.g., Haversine distance rather than Euclidean, or scale coordinates down by a factor of 0.5) to allow more cross-city semantic matches.
2. **Temporal Wrapping**: Currently, `hour` is treated as a linear numeric value. Hour 23 is considered very far from Hour 0 (23 units away), even though they are 1 hour apart. **Recommendation**: Convert `hour` to cyclical sine/cosine transformations (`sin(2 * pi * hour / 24)`) so midnight matches late night correctly.
3. **Categorical Weighting**: To ensure we strictly retrieve similar *types* of incidents (e.g., ensuring water logging matches water logging), we should multiply the `event_cause` one-hot vectors by a scalar (e.g., `2.0`), which would double the penalty of mismatched causes.

