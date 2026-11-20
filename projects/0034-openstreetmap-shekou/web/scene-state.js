const sceneKey = "shekou-scene:" + location.pathname;
let savedSceneState = null;
try {
  savedSceneState = JSON.parse(sessionStorage.getItem(sceneKey));
} catch {
  // The scenes also run when browser storage is unavailable.
}

window.openai = {
  widgetState: savedSceneState,
  async setWidgetState(state) {
    sessionStorage.setItem(sceneKey, JSON.stringify(state));
  }
};
