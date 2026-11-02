
import numpy as np

from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# Illustrative training data only.
# These are synthetic records, not real student data.

_rng = np.random.default_rng(42)

X = []
y = []

for _ in range(250):
    hours = _rng.uniform(0, 12)
    previous = _rng.uniform(25, 100)
    sleep = _rng.uniform(4, 10)
    papers = _rng.integers(0, 11)
    activities = _rng.integers(0, 2)

    score = (
        15
        + hours * 3.0
        + previous * 0.48
        + sleep * 1.2
        + papers * 1.5
        - activities * 1.0
        + _rng.normal(0, 5)
    )

    X.append([hours, previous, sleep, papers, activities])
    y.append(float(np.clip(score, 0, 100)))


model = LinearRegression()
model.fit(X, y)


def predict_performance(data):
    """
    Accepts a dictionary containing:
    study_hours, previous_scores, sleep_hours,
    practice_papers, extracurricular.
    """

    features = [[
        data["study_hours"],
        data["previous_scores"],
        data["sleep_hours"],
        data["practice_papers"],
        data["extracurricular"],
    ]]

    prediction = float(model.predict(features)[0])

    return round(float(np.clip(prediction, 0, 100)), 2)


def get_model_metrics():
    predictions = model.predict(X)

    mae = mean_absolute_error(y, predictions)
    mse = mean_squared_error(y, predictions)
    rmse = np.sqrt(mse)
    r2 = r2_score(y, predictions)

    return {
        "model": "Multiple Linear Regression",
        "training_samples": len(X),
        "mae": round(float(mae), 2),
        "mse": round(float(mse), 2),
        "rmse": round(float(rmse), 2),
        "r2": round(float(r2), 4),
        "dataset_type": "Illustrative synthetic data",
        "warning": (
            "These are training metrics calculated on synthetic data. "
            "They do not represent real-world prediction accuracy."
        ),
    }
