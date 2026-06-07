fetch("https://locamartin-auth.locamartin.workers.dev/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ page: "/" }),
}).catch(() => {});
