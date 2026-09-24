async function generateWorkerHash(password, iterations = 100000) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  // Convert Uint8Array to Base64
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));

  return `pbkdf2-sha256$${iterations}$${saltBase64}$${hashBase64}`;
}

// Generate for your password:
generateWorkerHash("YourPass").then(console.log);
