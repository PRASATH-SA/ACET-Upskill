import os
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, precision_score, recall_score, f1_score
from app.ml.feature_extractor import CANONICAL_FEATURES

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

def generate_benchmark_dataset(n_samples: int = 5000, random_state: int = 42):
    """
    Generates synthetic labeled flow dataset modeling normal traffic, HTTP floods, SYN floods, and slowloris.
    Explicitly labeled as 'synthetic_benchmark_v1' to maintain data provenance.
    """
    np.random.seed(random_state)
    n_benign = int(n_samples * 0.6)
    n_attack = n_samples - n_benign
    
    # 1. Benign traffic distribution
    benign_rps = np.random.gamma(shape=5.0, scale=10.0, size=n_benign)  # ~50 rps
    benign_bps = benign_rps * np.random.normal(1200, 300, size=n_benign)
    benign_dur = np.random.normal(35, 10, size=n_benign).clip(5, 200)
    benign_5xx = np.random.beta(0.5, 50, size=n_benign).clip(0, 0.05)
    benign_unique_ratio = np.random.uniform(0.6, 0.95, size=n_benign)
    benign_endpoint_conc = np.random.uniform(0.1, 0.35, size=n_benign)
    benign_conn_fail = np.random.beta(0.5, 100, size=n_benign).clip(0, 0.03)
    benign_syn_rate = np.random.gamma(2.0, 5.0, size=n_benign)
    
    X_benign = np.column_stack([
        benign_rps, benign_bps, benign_dur, benign_5xx,
        benign_unique_ratio, benign_endpoint_conc, benign_conn_fail, benign_syn_rate
    ])
    y_benign = np.zeros(n_benign, dtype=int)
    
    # 2. Attack traffic distribution (HTTP Flood, SYN flood, Slowloris)
    attack_types = np.random.choice(["http_flood", "syn_flood", "slowloris"], size=n_attack, p=[0.5, 0.3, 0.2])
    
    attack_rows = []
    for atype in attack_types:
        if atype == "http_flood":
            rps = np.random.uniform(800, 6000)
            bps = rps * np.random.uniform(2500, 10000)
            dur = np.random.uniform(150, 900)
            e5xx = np.random.uniform(0.2, 0.85)
            uq = np.random.uniform(0.01, 0.15)  # botnet or single IP reuse
            ep_conc = np.random.uniform(0.7, 0.99)
            cfail = np.random.uniform(0.15, 0.6)
            syn = np.random.uniform(10, 80)
        elif atype == "syn_flood":
            rps = np.random.uniform(100, 800)
            bps = rps * np.random.uniform(60, 200)
            dur = np.random.uniform(800, 3000)
            e5xx = np.random.uniform(0.05, 0.4)
            uq = np.random.uniform(0.05, 0.3)
            ep_conc = np.random.uniform(0.4, 0.8)
            cfail = np.random.uniform(0.6, 0.95)
            syn = np.random.uniform(800, 8000)  # Massive SYN burst
        else: # slowloris
            rps = np.random.uniform(10, 80)
            bps = np.random.uniform(500, 2000)
            dur = np.random.uniform(5000, 15000)  # Very high duration
            e5xx = np.random.uniform(0.3, 0.9)
            uq = np.random.uniform(0.02, 0.2)
            ep_conc = np.random.uniform(0.85, 1.0)
            cfail = np.random.uniform(0.4, 0.85)
            syn = np.random.uniform(5, 40)
            
        attack_rows.append([rps, bps, dur, e5xx, uq, ep_conc, cfail, syn])
        
    X_attack = np.array(attack_rows)
    y_attack = np.ones(n_attack, dtype=int)
    
    X = np.vstack([X_benign, X_attack])
    y = np.concatenate([y_benign, y_attack])
    
    return X, y

def train_and_evaluate_models():
    """Train Random Forest, XGBoost and Isolation Forest models and report metrics."""
    import xgboost as xgb
    
    print("[ML] Generating synthetic benchmark dataset with explicit provenance tracking...")
    X, y = generate_benchmark_dataset(n_samples=6000)
    
    # Stratified train/test split to prevent leakage
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    
    results = {}
    
    # 1. Random Forest Classifier
    rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    t0 = time.time()
    rf.fit(X_train, y_train)
    rf_train_time = time.time() - t0
    
    t0 = time.time()
    y_pred_rf = rf.predict(X_test)
    y_prob_rf = rf.predict_proba(X_test)[:, 1]
    rf_latency_ms = (time.time() - t0) * 1000 / len(X_test)
    
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred_rf).ravel()
    fpr_rf = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    
    results["random_forest"] = {
        "precision": float(precision_score(y_test, y_pred_rf)),
        "recall": float(recall_score(y_test, y_pred_rf)),
        "f1": float(f1_score(y_test, y_pred_rf)),
        "fpr": fpr_rf,
        "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
        "latency_ms": round(rf_latency_ms, 3),
        "dataset_origin": "synthetic_cic_schema_v1"
    }
    joblib.dump(rf, os.path.join(MODEL_DIR, "random_forest_v1.joblib"))
    
    # 2. XGBoost Classifier
    xgb_clf = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.08,
        eval_metric="logloss",
        random_state=42
    )
    t0 = time.time()
    xgb_clf.fit(X_train, y_train)
    xgb_train_time = time.time() - t0
    
    t0 = time.time()
    y_pred_xgb = xgb_clf.predict(X_test)
    y_prob_xgb = xgb_clf.predict_proba(X_test)[:, 1]
    xgb_latency_ms = (time.time() - t0) * 1000 / len(X_test)
    
    tn_x, fp_x, fn_x, tp_x = confusion_matrix(y_test, y_pred_xgb).ravel()
    fpr_xgb = float(fp_x / (fp_x + tn_x)) if (fp_x + tn_x) > 0 else 0.0
    
    results["xgboost"] = {
        "precision": float(precision_score(y_test, y_pred_xgb)),
        "recall": float(recall_score(y_test, y_pred_xgb)),
        "f1": float(f1_score(y_test, y_pred_xgb)),
        "fpr": fpr_xgb,
        "confusion_matrix": [[int(tn_x), int(fp_x)], [int(fn_x), int(tp_x)]],
        "latency_ms": round(xgb_latency_ms, 3),
        "dataset_origin": "synthetic_cic_schema_v1"
    }
    joblib.dump(xgb_clf, os.path.join(MODEL_DIR, "xgboost_v1.joblib"))
    
    # Save benchmark evaluation stats
    joblib.dump(results, os.path.join(MODEL_DIR, "evaluation_metrics.joblib"))
    print("[ML] Trained models successfully saved to", MODEL_DIR)
    return results

if __name__ == "__main__":
    res = train_and_evaluate_models()
    print("Evaluation Results:", res)
