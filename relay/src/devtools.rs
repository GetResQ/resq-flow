use axum::Json;
use axum::extract::State;
use serde::Serialize;

use crate::AppState;

#[derive(Debug, Serialize)]
pub struct ResetResponse {
    pub status: &'static str,
}

pub async fn reset_live_session(State(state): State<AppState>) -> Json<ResetResponse> {
    state.hub.reset(Some("replay".to_string())).await;
    Json(ResetResponse { status: "ok" })
}
