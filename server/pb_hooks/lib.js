// Appel du worker interne (réseau docker, jamais exposé). Les handlers n'ont pas accès à la portée du fichier: on passe par require().
module.exports = {
  worker(path, body, timeout) {
    return $http.send({
      url: $os.getenv("WORKER_URL") + path,
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "X-Worker-Secret": $os.getenv("WORKER_SECRET") },
      timeout: timeout || 60,
    })
  },
  secretOf(app, userId) {
    try {
      return app.findFirstRecordByFilter("secrets", "user = {:u}", { u: userId })
    } catch (_) {
      return null
    }
  },
}
